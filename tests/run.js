/* Pinpoint test suite. Run with:  node tests/run.js
   Loads the browser-free parts of the app (core, sources, state) into a sandbox and checks
   generated citations against example citations from the AGLC4 text. No dependencies. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const root = path.join(__dirname, '..');
const code = ['js/core.js', 'js/sources.js', 'js/state.js']
  .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n;\n') +
  '\n;globalThis.__api={TMAP,prep,fullCite,bibEntry,subRef,inText,sortKey,bibliography,sequence,SETTINGS,pl,' +
  'migrate,sanitise,defaultState,exportLibrary,importLibrary,loadState,saveState,STORE_KEY};';

/* A fake localStorage so the storage layer can be tested too. */
function makeStorage(initial = {}, { failWrites = false } = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (failWrites) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
    removeItem: k => m.delete(k),
    _map: m,
  };
}
function load(storage) {
  const ctx = { console, localStorage: storage || makeStorage() };
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: 'pinpoint.js' });
  return ctx.__api;
}
const A = load();

let pass = 0, fail = 0;
const failures = [];
function check(name, got, want) {
  if (got === want) { pass++; return; }
  fail++; failures.push(`✗ ${name}\n    want: ${want}\n    got:  ${got}`);
}
function test(name, fn) {
  try { fn(); } catch (e) { fail++; failures.push(`✗ ${name}\n    threw: ${e.stack || e}`); }
}
const plain = html => A.pl(html).replace(/\s+/g, ' ').trim();
function full(type, d, { sig = '', cap = true } = {}) {
  A.SETTINGS.cap = cap;
  const t = A.TMAP[type];
  const out = plain(A.fullCite(t, A.prep(t, d, false), sig));
  A.SETTINGS.cap = true;
  return out;
}
function bib(type, d) { return plain(A.bibEntry(A.TMAP[type], d)); }
const P = (given, surname) => ({ kind: 'person', given, surname });
const B = name => ({ kind: 'body', name });

/* ---------------- Cases ---------------- */
const CITES = [
  ['reported case, round year', 'case-rep', { name: 'Wirth v Wirth', yb: 'round', year: '1956', vol: '98', rep: 'CLR', page: '228', pin: '237', jj: 'Dixon CJ' },
    'Wirth v Wirth (1956) 98 CLR 228, 237 (Dixon CJ).'],
  ['reported case, square year', 'case-rep', { name: 'Bakker v Stewart', yb: 'square', year: '1980', rep: 'VR', page: '17', pin: '22' },
    'Bakker v Stewart [1980] VR 17, 22.'],
  ['case name clean-up (& Ors, v., Pty.)', 'case-rep', { name: 'Hot Holdings Pty. Ltd. v. Creasy & Ors', yb: 'round', year: '1996', vol: '185', rep: 'CLR', page: '149' },
    'Hot Holdings Pty Ltd v Creasy (1996) 185 CLR 149.'],
  ['case short title', 'case-rep', { name: 'Penfolds Wines Pty Ltd v Elliott', yb: 'round', year: '1946', vol: '74', rep: 'CLR', page: '204', st: 'Penfolds Wines' },
    'Penfolds Wines Pty Ltd v Elliott (1946) 74 CLR 204 (‘Penfolds Wines’).'],
  ['medium neutral, para span auto-bracketed', 'case-mnc', { name: 'R v De Gruchy', year: '2006', court: 'VSCA', num: '10', pin: '4-5', jj: 'Vincent JA' },
    'R v De Gruchy [2006] VSCA 10, [4]–[5] (Vincent JA).'],
  ['(No 2) becomes [No 2]', 'case-mnc', { name: 'Re Culleton (No 2)', year: '2017', court: 'HCA', num: '4', pin: '57', jj: 'Nettle J' },
    'Re Culleton [No 2] [2017] HCA 4, [57] (Nettle J).'],
  ['unreported without MNC', 'case-unrep', { name: 'Ross v Chambers', court: 'Supreme Court of the Northern Territory', jj: 'Kriewaldt J', date: '5 April 1956', pin: '77-8' },
    'Ross v Chambers (Supreme Court of the Northern Territory, Kriewaldt J, 5 April 1956) 77–8.'],
  ['proceeding', 'case-proc', { name: 'Australian Competition and Consumer Commission v Olex Australia Pty Ltd', court: 'Federal Court of Australia', num: 'VID725/2014', date: '3 December 2014' },
    'Australian Competition and Consumer Commission v Olex Australia Pty Ltd (Federal Court of Australia, VID725/2014, commenced 3 December 2014).'],
  ['court order', 'case-order', { jj: 'Burley J', name: 'Seiko Epson Corporation v Calidad Pty Ltd', court: 'Federal Court of Australia', num: 'NSD1519/2004', date: '21 December 2016' },
    'Order of Burley J in Seiko Epson Corporation v Calidad Pty Ltd (Federal Court of Australia, NSD1519/2004, 21 December 2016).'],
  ['tribunal (MNC)', 'tribunal', { mode: 'mnc', name: 'Application by AAPT Ltd [No 2]', year: '2009', court: 'ACompT', num: '6', pin: '[6.1]–[6.5]', jj: 'Finkelstein J, Member Davey and Prof Round' },
    'Application by AAPT Ltd [No 2] [2009] ACompT 6, [6.1]–[6.5] (Finkelstein J, Member Davey and Prof Round).'],
  ['arbitral award', 'arbitration', { name: 'Sandline International Inc v Papua New Guinea', desc: 'Award', forum: 'Sir Edward Somers, Sir Michael Kerr and Sir Daryl Dawson', date: '9 October 1998', pin: '[10.2]' },
    'Sandline International Inc v Papua New Guinea (Award, Sir Edward Somers, Sir Michael Kerr and Sir Daryl Dawson, 9 October 1998) [10.2].'],
  ['HCA transcript', 'transcript', { mode: 'hca', name: 'Mulholland v Australian Electoral Commission', year: '2004', hnum: '8', pin: '2589-93', spk: 'McHugh J' },
    'Transcript of Proceedings, Mulholland v Australian Electoral Commission [2004] HCATrans 8, 2589–93 (McHugh J).'],
  ['general transcript', 'transcript', { mode: 'gen', name: 'Celano v Swan', court: 'County Court of Victoria', num: '09/0867', jj: 'Judge Lacava', date: '27 August 2009', pin: '11', spk: 'SM Petrovich' },
    'Transcript of Proceedings, Celano v Swan (County Court of Victoria, 09/0867, Judge Lacava, 27 August 2009) 11 (SM Petrovich).'],

  /* ---------------- Legislation ---------------- */
  ['Act', 'act', { title: 'Crimes Act', year: '1958', jur: 'Vic', pin: 's 3' }, 'Crimes Act 1958 (Vic) s 3.'],
  ['Act with short title', 'act', { title: 'Property Law Act', year: '1958', jur: 'Vic', pin: 's 6', st: 'Property Act' }, 'Property Law Act 1958 (Vic) s 6 (‘Property Act’).'],
  ['tax provision keeps its hyphen', 'act', { title: 'Income Tax Assessment Act', year: '1997', jur: 'Cth', pin: 's 20-110(1)(a)' }, 'Income Tax Assessment Act 1997 (Cth) s 20-110(1)(a).'],
  ['Bill', 'bill', { title: 'Carbon Pollution Reduction Scheme Bill', year: '2009', jur: 'Cth', pin: 'cl 83' }, 'Carbon Pollution Reduction Scheme Bill 2009 (Cth) cl 83.'],
  ['delegated legislation', 'deleg', { title: 'Uniform Civil Procedure Rules', year: '2005', jur: 'NSW', pin: 'r 6.2(1), (3A)(a)–(b)' }, 'Uniform Civil Procedure Rules 2005 (NSW) r 6.2(1), (3A)(a)–(b).'],
  ['Australian Constitution', 'const', { mode: 'aust', pin: 's 51(ii)' }, 'Australian Constitution s 51(ii).'],
  ['Constitution in Imperial Act', 'const', { mode: 'imp', pin: 's 9' }, 'Commonwealth of Australia Constitution Act 1900 (Imp) 63 & 64 Vict, c 12, s 9.'],
  ['explanatory notes', 'em', { kind: 'Explanatory Notes', title: 'Adoption Bill', year: '2009', jur: 'Qld', pin: '5–6, 29' }, 'Explanatory Notes, Adoption Bill 2009 (Qld) 5–6, 29.'],
  ['legislative history', 'leghist', { t1: 'Crimes Act', y1: '1958', j1: 'Vic', p1: 's 3B', rel: 'as inserted by', t2: 'Crimes (Homicide) Act', y2: '2005', j2: 'Vic', p2: 's 3' },
    'Crimes Act 1958 (Vic) s 3B, as inserted by Crimes (Homicide) Act 2005 (Vic) s 3.'],
  ['gazette', 'gazette', { jur: 'Commonwealth', gtitle: 'Gazette: Special', num: 'S 489', date: '1 December 2004' }, 'Commonwealth, Gazette: Special, No S 489, 1 December 2004.'],
  ['tax ruling', 'ruling', { body: 'Australian Taxation Office', title: 'Income tax: carrying on a business as a professional artist', docno: 'TR 2005/1', date: '12 January 2005' },
    'Australian Taxation Office, Income Tax: Carrying on a Business as a Professional Artist (TR 2005/1, 12 January 2005).'],
  ['non-government rules', 'nongov', { body: 'Victorian Bar', title: 'Compulsory Continuing Professional Development Rules', date: '1 April 2011', pin: 'rr 4–5' },
    'Victorian Bar, Compulsory Continuing Professional Development Rules (at 1 April 2011) rr 4–5.'],
  ['practice note', 'practice', { court: 'Supreme Court of Victoria', ident: 'Practice Note SC Gen 10', title: 'Conduct of Group Proceedings (Class Actions)', mode: 'unrep', date: '30 January 2017' },
    'Supreme Court of Victoria, Practice Note SC Gen 10: Conduct of Group Proceedings (Class Actions), 30 January 2017.'],

  /* ---------------- Parliament ---------------- */
  ['Hansard', 'hansard', { jur: 'Commonwealth', chamber: 'Senate', date: '7 February 2017', pin: '39', spk: 'George Brandis', pos: 'Attorney-General' },
    'Commonwealth, Parliamentary Debates, Senate, 7 February 2017, 39 (George Brandis, Attorney-General).'],
  ['Hansard without speaker', 'hansard', { jur: 'Victoria', chamber: 'Legislative Council', date: '14 December 2017', pin: '6854' },
    'Victoria, Parliamentary Debates, Legislative Council, 14 December 2017, 6854.'],
  ['submission to inquiry', 'subinq', { au: [B('Mobil Oil Australia')], no: '25', committee: 'Australian Competition and Consumer Commission', inquiry: 'Inquiry into the Price of Unleaded Petrol', date: '27 July 2007', pin: '6–7' },
    'Mobil Oil Australia, Submission No 25 to Australian Competition and Consumer Commission, Inquiry into the Price of Unleaded Petrol (27 July 2007) 6–7.'],
  ['evidence to committee', 'evidence', { committee: 'House Standing Committee on Tax and Revenue', legis: 'Parliament of Australia', loc: 'Canberra', date: '30 November 2016', pin: '2', spk: 'Peter Strong' },
    'Evidence to House Standing Committee on Tax and Revenue, Parliament of Australia, Canberra, 30 November 2016, 2 (Peter Strong).'],
  ['convention debates', 'convention', { title: 'Official Record of the Debates of the Australasian Federal Convention', loc: 'Sydney', date: '2 September 1897', pin: '19', spk: 'Edmund Barton' },
    'Official Record of the Debates of the Australasian Federal Convention, Sydney, 2 September 1897, 19 (Edmund Barton).'],
  ['committee report', 'rpt-comm', { committee: 'Senate Legal and Constitutional References Committee', legis: 'Parliament of Australia', title: 'Administration and Operation of the Migration Act 1958', dtype: 'Report', date: 'March 2006', pin: '280–1 [9.30]–[9.38]' },
    'Senate Legal and Constitutional References Committee, Parliament of Australia, Administration and Operation of the Migration Act 1958 (Report, March 2006) 280–1 [9.30]–[9.38].'],
  ['media release', 'media', { au: [B('Department of Defence (Cth)')], title: 'Highest East Timorese Honour for Army Officers', rtype: 'Media Release', dno: 'MSPA 172/09', date: '22 May 2009' },
    'Department of Defence (Cth), ‘Highest East Timorese Honour for Army Officers’ (Media Release MSPA 172/09, 22 May 2009).'],

  /* ---------------- Journals & books ---------------- */
  ['journal article (title case, issue, pinpoint span)', 'journal', { au: [P('Andrew', 'Edgar')], title: 'administrative regulation-making: contrasting parliamentary and deliberative legitimacy', yb: 'round', year: '2017', vol: '40', issue: '3', journal: 'Melbourne University Law Review', status: 'pub', page: '738', pin: '747-9' },
    'Andrew Edgar, ‘Administrative Regulation-Making: Contrasting Parliamentary and Deliberative Legitimacy’ (2017) 40(3) Melbourne University Law Review 738, 747–9.'],
  ['journal organised by year, season issue', 'journal', { au: [P('Dawn', 'Oliver')], title: 'Is the Ultra Vires Rule the Basis of Judicial Review?', yb: 'square', year: '1987', issue: 'Winter', journal: 'Public Law', status: 'pub', page: '543' },
    'Dawn Oliver, ‘Is the Ultra Vires Rule the Basis of Judicial Review?’ [1987] (Winter) Public Law 543.'],
  ['journal: month issue', 'journal', { au: [P('AP', 'Simester')], title: 'Accessory Liability and Common Unlawful Purposes', yb: 'round', year: '2017', vol: '133', issue: 'January', journal: 'Law Quarterly Review', status: 'pub', page: '73' },
    'AP Simester, ‘Accessory Liability and Common Unlawful Purposes’ (2017) 133 (January) Law Quarterly Review 73.'],
  ['journal: leading “The” dropped', 'journal', { au: [P('RJ', 'Ellicott')], title: 'The Autochthonous Expedient and the Federal Court', yb: 'round', year: '2008', vol: '82', issue: '10', journal: 'The Australian Law Journal', status: 'pub', page: '700' },
    'RJ Ellicott, ‘The Autochthonous Expedient and the Federal Court’ (2008) 82(10) Australian Law Journal 700.'],
  ['journal: forthcoming', 'journal', { au: [P('Michael', 'Crommelin')], title: 'Powers of the Head of State', yb: 'round', year: '2015', vol: '38', issue: '3', journal: 'Melbourne University Law Review', status: 'advance' },
    'Michael Crommelin, ‘Powers of the Head of State’ (2015) 38(3) Melbourne University Law Review (advance).'],
  ['book: initials cleaned, edition superscript', 'book', { au: [P('R.P.', 'Austin'), P('I. M.', 'Ramsay')], role: 'au', title: "Ford's Principles of Corporations Law", pub: 'LexisNexis Butterworths', edn: '15', year: '2013' },
    'RP Austin and IM Ramsay, Ford’s Principles of Corporations Law (LexisNexis Butterworths, 15th ed, 2013).'],
  ['book: revised edition, pinpoint', 'book', { au: [P('Ernest J', 'Weinrib')], role: 'au', title: 'The Idea of Private Law', pub: 'Oxford University Press', rev: true, year: '2012', pin: '55' },
    'Ernest J Weinrib, The Idea of Private Law (Oxford University Press, rev ed, 2012) 55.'],
  ['book: multi-volume, year span', 'book', { au: [P('Joel', 'Feinberg')], role: 'au', title: 'The Moral Limits of the Criminal Law', pub: 'Oxford University Press', year: '1984-88', volk: 'vol', vol: '4', pin: '45' },
    'Joel Feinberg, The Moral Limits of the Criminal Law (Oxford University Press, 1984–88) vol 4, 45.'],
  ['book: more than three authors', 'book', { au: [P('Paul', 'Rishworth'), P('Grant', 'Huscroft'), P('Scott', 'Optican'), P('Richard', 'Mahoney')], role: 'au', title: 'The New Zealand Bill of Rights', pub: 'Oxford University Press', year: '2003' },
    'Paul Rishworth et al, The New Zealand Bill of Rights (Oxford University Press, 2003).'],
  ['book: editor only', 'book', { au: [P('Peter', 'Birks')], role: 'eds', title: 'New Perspectives in the Roman Law of Property: Essays for Barry Nicholas', pub: 'Clarendon Press', year: '1989' },
    'Peter Birks (ed), New Perspectives in the Roman Law of Property: Essays for Barry Nicholas (Clarendon Press, 1989).'],
  ['book: author and editor', 'book', { au: [P('JS', 'Mill')], role: 'au', title: 'Utilitarianism', edby: 'Roger Crisp', pub: 'Oxford University Press', year: '1998', pin: '14' },
    'JS Mill, Utilitarianism, ed Roger Crisp (Oxford University Press, 1998) 14.'],
  ['chapter in edited book', 'chapter', { au: [P('Jeremy', 'Waldron')], ctitle: 'Do Judges Reason Morally?', eds: [P('Grant', 'Huscroft')], btitle: 'Expounding the Constitution: Essays in Constitutional Theory', pub: 'Cambridge University Press', year: '2008', start: '38' },
    'Jeremy Waldron, ‘Do Judges Reason Morally?’ in Grant Huscroft (ed), Expounding the Constitution: Essays in Constitutional Theory (Cambridge University Press, 2008) 38.'],
  ['audiobook', 'audiobook', { au: [P('George', 'Orwell')], title: '1984', pub: 'Blackstone Audio', year: '2007', pin: '11:15:05' },
    'George Orwell, 1984 (Audiobook, Blackstone Audio, 2007) 11:15:05.'],

  /* ---------------- Reports & papers ---------------- */
  ['law reform report with volume', 'rpt-lrc', { lrc: 'Australian Law Reform Commission', title: 'For Your Information: Australian Privacy Law and Practice', dtype: 'Report', dno: '108', date: 'May 2008', vol: '1', pin: '339 [7.7]' },
    'Australian Law Reform Commission, For Your Information: Australian Privacy Law and Practice (Report No 108, May 2008) vol 1, 339 [7.7].'],
  ['royal commission', 'rpt-royal', { title: 'Royal Commission into Trade Union Governance and Corruption', dtype: 'Final Report', date: 'December 2015', vol: '2' },
    'Royal Commission into Trade Union Governance and Corruption (Final Report, December 2015) vol 2.'],
  ['general report, no author', 'rpt', { au: [], title: 'Review of the Law of Negligence', dtype: 'Final Report', date: 'September 2002', pin: '37–57' },
    'Review of the Law of Negligence (Final Report, September 2002) 37–57.'],
  ['ABS', 'rpt-abs', { title: 'Corrective Services, Australia, September Quarter 2017', dno: '4512.0', date: '30 November 2017' },
    'Australian Bureau of Statistics, Corrective Services, Australia, September Quarter 2017 (Catalogue No 4512.0, 30 November 2017).'],
  ['research paper', 'paper', { au: [P('Matthew H', 'Kramer')], title: 'The Illusion of Neutrality: Abortion and the Foundations of Justice', dtype: 'Research Paper', dno: '9/2017', inst: 'Faculty of Law, University of Cambridge', date: 'January 2017' },
    'Matthew H Kramer, ‘The Illusion of Neutrality: Abortion and the Foundations of Justice’ (Research Paper No 9/2017, Faculty of Law, University of Cambridge, January 2017).'],
  ['conference paper', 'paper-conf', { au: [P('Ian', 'Mutton')], title: 'Extra-Territoriality: A Case Study', dtype: 'Conference Paper', inst: 'International Trade Law Conference', date: '29 May 1997' },
    'Ian Mutton, ‘Extra-Territoriality: A Case Study’ (Conference Paper, International Trade Law Conference, 29 May 1997).'],
  ['thesis', 'thesis', { au: [P('Jonathan G', 'Ercanbrack')], title: 'The Law of Islamic Finance in the United Kingdom: Legal Pluralism and Financial Competition', dtype: 'PhD Thesis', inst: 'University of London', date: '2011' },
    'Jonathan G Ercanbrack, ‘The Law of Islamic Finance in the United Kingdom: Legal Pluralism and Financial Competition’ (PhD Thesis, University of London, 2011).'],
  ['named lecture', 'speech', { au: [P('Virginia', 'Bell')], title: 'Section 80: The Great Constitutional Tautology', kind: 'Lucinda Lecture', forum: 'Monash University', date: '24 October 2013' },
    'Virginia Bell, ‘Section 80: The Great Constitutional Tautology’ (Lucinda Lecture, Monash University, 24 October 2013).'],

  /* ---------------- Reference works ---------------- */
  ['print dictionary', 'dict', { title: 'Macquarie Dictionary', mode: 'print', edn: '5', year: '2009', entry: 'demise', def: '4' }, 'Macquarie Dictionary (5th ed, 2009) ‘demise’ (def 4).'],
  ['online dictionary', 'dict', { title: 'Encyclopaedic Australian Legal Dictionary', mode: 'online', date: '20 February 2018', entry: 'default judgment', def: '1' },
    'Encyclopaedic Australian Legal Dictionary (online at 20 February 2018) ‘default judgment’ (def 1).'],
  ['print encyclopedia', 'encyc', { pub: 'LexisNexis', title: "Halsbury's Laws of Australia", mode: 'print', vol: '15', date: '25 May 2009', tno: '235', tname: 'Insurance', ch: '2 General Principles', pin: '[235-270]' },
    'LexisNexis, Halsbury’s Laws of Australia, vol 15 (at 25 May 2009) 235 Insurance, ‘2 General Principles’ [235-270].'],
  ['looseleaf', 'looseleaf', { au: [P('Neil J', 'Williams')], pub: 'LexisNexis Butterworths', title: 'Civil Procedure: Victoria', mode: 'print', vol: '1', svc: 'Service 299', pin: '[21.01.1]' },
    'Neil J Williams, LexisNexis Butterworths, Civil Procedure: Victoria, vol 1 (at Service 299) [21.01.1].'],
  ['online looseleaf', 'looseleaf', { au: [P('JW', 'Carter')], pub: 'LexisNexis', title: 'Carter on Contract', mode: 'online', date: '20 February 2018', pin: '[04-001]' },
    'JW Carter, LexisNexis, Carter on Contract (online at 20 February 2018) [04-001].'],
  ['trade mark', 'ip', { code: 'AU', ipt: 'Trade Mark', num: '1701985', date: '22 June 2015', status: 'Registered', sdate: '28 January 2016' },
    'AU Trade Mark No 1701985, filed on 22 June 2015 (Registered on 28 January 2016).'],
  ['company constitution', 'corpdoc', { dtype: 'Constitution', co: 'ASX', date: '5 October 2012', pin: 'cl 1.1' }, 'Constitution, ASX (at 5 October 2012) cl 1.1.'],

  /* ---------------- Media & online ---------------- */
  ['print newspaper', 'news', { akind: 'au', au: [P('Stephanie', 'Peatling')], title: 'Female Chief Justice Rewrites the Script', paper: 'The Age', place: 'Melbourne', date: '31 January 2017', pin: '6' },
    'Stephanie Peatling, ‘Female Chief Justice Rewrites the Script’, The Age (Melbourne, 31 January 2017) 6.'],
  ['editorial with section', 'news', { akind: 'ed', title: 'Medicare by Name, No Longer by Nature', section: 'News', paper: 'The Age', place: 'Melbourne', date: '12 March 2004', pin: '12' },
    'Editorial, ‘Medicare by Name, No Longer by Nature’, News, The Age (Melbourne, 12 March 2004) 12.'],
  ['letter to the editor (untitled)', 'news', { akind: 'au', au: [P('Rose', 'Healy')], untitled: true, title: 'Letter to the Editor', paper: 'The Herald Sun', place: 'Melbourne', date: '10 June 2002', pin: '16' },
    'Rose Healy, Letter to the Editor, The Herald Sun (Melbourne, 10 June 2002) 16.'],
  ['online newspaper', 'news-online', { au: [P('Farrah', 'Tomazin')], title: 'Kinder Wages Breakthrough', paper: 'The Age', date: '19 May 2009', url: 'http://www.theage.com.au/x.html' },
    'Farrah Tomazin, ‘Kinder Wages Breakthrough’, The Age (online, 19 May 2009) <http://www.theage.com.au/x.html>.'],
  ['magazine', 'magazine', { au: [P('Jill', 'Lepore')], title: 'The History Test', date: '27 March 2017', mag: 'The New Yorker', pin: '66' },
    'Jill Lepore, ‘The History Test’ (27 March 2017) The New Yorker 66.'],
  ['blog post with archive link', 'web', { au: [P('Martin', 'Clark')], dtitle: 'Koani v The Queen', site: 'Opinions on High', dtype: 'Blog Post', date: '18 October 2017', url: 'http://blogs.example/koani', arch: 'https://perma.cc/FD2P-M22L' },
    'Martin Clark, ‘Koani v The Queen’, Opinions on High (Blog Post, 18 October 2017) <http://blogs.example/koani>, archived at <https://perma.cc/FD2P-M22L>.', { cap: false }],
  ['social media post', 'social', { user: '@s_m_stephenson', who: 'Scott Stephenson', plat: 'Twitter', date: '17 July 2017', time: '9:37 pm AEST', url: 'https://twitter.com/s_m_stephenson/status/1' },
    '@s_m_stephenson (Scott Stephenson) (Twitter, 17 July 2017, 9:37pm AEST) <https://twitter.com/s_m_stephenson/status/1>.'],
  ['film with pinpoint', 'film', { title: 'The Dark Knight', studio: 'Warner Brothers Pictures', year: '2008', pin: '0:54:58-0:55:11' },
    'The Dark Knight (Warner Brothers Pictures, 2008) 0:54:58–0:55:11.'],
  ['TV episode, extended version', 'tv', { ep: 'Pilot', series: 'Suits', ver: 'Extended Version', prod: 'Open 4 Business Productions', year: '2011', pin: '0:14:53' },
    '‘Pilot’, Suits (Extended Version, Open 4 Business Productions, 2011) 0:14:53.'],
  ['radio segment', 'podcast', { ep: 'Inventions: Who Owns Them?', series: 'The Law Report', prod: 'ABC Radio National', date: '8 September 2009' },
    '‘Inventions: Who Owns Them?’, The Law Report (ABC Radio National, 8 September 2009).'],
  ['email', 'corr', { kind: 'Email', from: 'Vanessa Li', to: 'Samantha Jones', date: '4 November 2015' }, 'Email from Vanessa Li to Samantha Jones, 4 November 2015.'],
  ['conversation', 'interview', { fmt: 'Conversation', who: 'Chief Justice John G Roberts Jr', pos: 'Chief Justice of the Supreme Court of the United States', by: 'Carolyn Evans', forum: 'Melbourne Law School, The University of Melbourne', date: '20 July 2017' },
    'Conversation with Chief Justice John G Roberts Jr, Chief Justice of the Supreme Court of the United States (Carolyn Evans, Melbourne Law School, The University of Melbourne, 20 July 2017).'],

  /* ---------------- International ---------------- */
  ['multilateral treaty', 'treaty', { title: 'Vienna Convention on the Law of Treaties', mode: 'open', date: '23 May 1969', series: '1155 UNTS 331', eif: '27 January 1980' },
    'Vienna Convention on the Law of Treaties, opened for signature 23 May 1969, 1155 UNTS 331 (entered into force 27 January 1980).'],
  ['bilateral, signed and in force same day', 'treaty', { title: 'Agreement Relating to Co-operation on Antitrust Matters', parties: 'Australia, United States of America', mode: 'same', date: '29 June 1982', series: '1369 UNTS 43' },
    'Agreement Relating to Co-operation on Antitrust Matters, Australia–United States of America, 1369 UNTS 43 (signed and entered into force 29 June 1982).'],
  ['treaty not yet in force', 'treaty', { title: 'Multilateral Convention to Implement Tax Treaty Related Measures to Prevent Base Erosion and Profit Shifting', mode: 'open', date: '31 December 2016', series: '[2017] ATNIF 23', nyif: true },
    'Multilateral Convention to Implement Tax Treaty Related Measures to Prevent Base Erosion and Profit Shifting, opened for signature 31 December 2016, [2017] ATNIF 23 (not yet in force).'],
  ['UN Charter', 'charter', { doc: 'Charter of the United Nations', pin: 'art 51' }, 'Charter of the United Nations art 51.'],
  ['GA resolution with adoption date', 'unres', { title: 'United Nations Declaration on the Rights of Indigenous Peoples', organ: 'GA Res', num: '61/295', doc: 'A/RES/61/295', date: '2 October 2007', adopted: '13 September 2007' },
    'United Nations Declaration on the Rights of Indigenous Peoples, GA Res 61/295, UN Doc A/RES/61/295 (2 October 2007, adopted 13 September 2007).'],
  ['SC resolution, untitled', 'unres', { organ: 'SC Res', num: '1441', doc: 'S/RES/1441', date: '8 November 2002' }, 'SC Res 1441, UN Doc S/RES/1441 (8 November 2002).'],
  ['UN document with session and meeting', 'undoc', { rec: 'UN SCOR', sess: '62', mtg: '5663', doc: 'S/PV.5663', date: '17 April 2007' }, 'UN SCOR, 62nd sess, 5663rd mtg, UN Doc S/PV.5663 (17 April 2007).'],
  ['treaty committee views', 'uncomm', { comm: 'Human Rights Committee', dtype: 'Views', cno: '1011/2001', sess: '81', doc: 'CCPR/C/81/D/1011/2001', date: '26 August 2004', pin: '21 [9.8]', st: 'Madafferi v Australia' },
    'Human Rights Committee, Views: Communication No 1011/2001, 81st sess, UN Doc CCPR/C/81/D/1011/2001 (26 August 2004) 21 [9.8] (‘Madafferi v Australia’).'],
  ['ICJ judgment', 'icj', { name: 'LaGrand', parties: 'Germany v United States of America', phase: 'Judgment', mode: 'rep', year: '2001', series: 'ICJ Rep', page: '466' },
    'LaGrand (Germany v United States of America) (Judgment) [2001] ICJ Rep 466.'],
  ['state–state arbitration (RIAA)', 'arb-state', { name: 'Southern Bluefin Tuna', parties: 'Australia v Japan', phase: 'Jurisdiction and Admissibility', mode: 'rep', year: '2000', vol: '23', series: 'RIAA', page: '1' },
    'Southern Bluefin Tuna (Australia v Japan) (Jurisdiction and Admissibility) (2000) 23 RIAA 1.'],
  ['investor–state (ICSID)', 'arb-inv', { name: 'CMS Gas Transmission Co v Argentina', phase: 'Annulment', mode: 'unrep', trib: 'ICSID Arbitral Tribunal', caseno: 'Case No ARB/01/8', date: '25 September 2007', pin: '[158]–[159]' },
    'CMS Gas Transmission Co v Argentina (Annulment) (ICSID Arbitral Tribunal, Case No ARB/01/8, 25 September 2007) [158]–[159].'],
  ['international criminal tribunal', 'icc', { name: 'Prosecutor v Kambanda', phase: 'Decision Ordering the Continued Detention', court: 'International Criminal Tribunal for Rwanda', chamber: 'Trial Chamber I', caseno: 'ICTR-97-23-T', date: '1 May 1998' },
    'Prosecutor v Kambanda (Decision Ordering the Continued Detention) (International Criminal Tribunal for Rwanda, Trial Chamber I, Case No ICTR-97-23-T, 1 May 1998).'],
  ['WTO panel report', 'wto', { kind: 'Panel Report', name: 'China -- Measures Affecting the Protection and Enforcement of Intellectual Property Rights', doc: 'WT/DS362/R', date: '26 January 2009', pin: '[7.28]–[7.50]' },
    'Panel Report, China — Measures Affecting the Protection and Enforcement of Intellectual Property Rights, WTO Doc WT/DS362/R (26 January 2009) [7.28]–[7.50].'],
  ['CJEU reported', 'cjeu', { name: 'Grad v Finanzamt Traunstein', cno: 'C-9/70', mode: 'rep', year: '1970', series: '2 ECR', page: '825', pin: '833' },
    'Grad v Finanzamt Traunstein (C-9/70) [1970] 2 ECR 825, 833.'],
  ['ECtHR unreported', 'echr', { name: 'S v United Kingdom', mode: 'unrep', chamber: 'Grand Chamber', app: '30562/04 and 30566/04', date: '4 December 2008', pin: '[125]' },
    'S v United Kingdom (European Court of Human Rights, Grand Chamber, Application Nos 30562/04 and 30566/04, 4 December 2008) [125].'],

  /* ---------------- Foreign ---------------- */
  ['UK neutral citation', 'fcase', { mode: 'mnc', name: 'Four Seasons Holdings Inc v Brownlie', year: '2017', court: 'UKSC', num: '80', pin: '33', jj: 'Lady Hale' },
    'Four Seasons Holdings Inc v Brownlie [2017] UKSC 80, [33] (Lady Hale).'],
  ['UK Act with regnal year', 'uk-act', { title: 'Factories Act', year: '1961', regnal: '9 & 10 Eliz 2', chap: '34' }, 'Factories Act 1961, 9 & 10 Eliz 2, c 34.'],
  ['Imperial Act', 'uk-act', { title: 'Colonial Laws Validity Act', year: '1865', jur: 'Imp', regnal: '28 & 29 Vict', chap: '63' }, 'Colonial Laws Validity Act 1865 (Imp) 28 & 29 Vict, c 63.'],
  ['UK statutory instrument', 'uk-si', { title: "Magistrates' Courts (International Criminal Court) (Forms) Rules", year: '2001', jur: 'UK', series: 'SI', num: '2001/2600', pin: 'r 4' },
    'Magistrates’ Courts (International Criminal Court) (Forms) Rules 2001 (UK) SI 2001/2600, r 4.'],
  ['UK Hansard', 'uk-hansard', { chamber: 'House of Commons', date: '16 February 1998', vol: '306', col: '778', spk: 'Jack Straw' },
    'United Kingdom, Parliamentary Debates, House of Commons, 16 February 1998, vol 306, col 778 (Jack Straw).'],
  ['UK command paper', 'uk-cmd', { au: [B('Department for Transport (UK)')], title: 'Low Carbon Transport: A Greener Future', paper: 'Cm 7682', year: '2009', pin: '18' },
    'Department for Transport (UK), Low Carbon Transport: A Greener Future (Cm 7682, 2009) 18.'],
  ['US Supreme Court', 'us-case', { mode: 'rep', name: 'Roper v Simmons', vol: '543', series: 'US', page: '551', year: '2005', pin: '567' }, 'Roper v Simmons, 543 US 551, 567 (2005).'],
  ['US state case with judge', 'us-case', { mode: 'rep', name: 'State v Aponte', vol: '738', series: 'A 2d', page: '117', court: 'Conn', year: '1999', pin: '134', jj: 'McDonald J' },
    'State v Aponte, 738 A 2d 117, 134 (McDonald J) (Conn, 1999).'],
  ['US unreported slip opinion', 'us-case', { mode: 'unrep', name: 'Torres v Oklahoma', court: 'Okla Ct Crim App', docket: 'No PCD-04-442', date: '13 May 2004', pin: '7' },
    'Torres v Oklahoma (Okla Ct Crim App, No PCD-04-442, 13 May 2004) slip op 7.'],
  ['US Code', 'us-code', { title: 'Federal Deposit Insurance Act', tno: '12', code: 'USC', sec: '§§ 1811–35a', year: '2006' }, 'Federal Deposit Insurance Act, 12 USC §§ 1811–35a (2006).'],
  ['Canadian statute', 'ca-stat', { title: 'Criminal Code', vol: 'RSC', year: '1985', chap: 'C-46', pin: 's 515' }, 'Criminal Code, RSC 1985, c C-46, s 515.'],
];

for (const [name, type, d, want, opts] of CITES) test(name, () => check(`${type}: ${name}`, full(type, d, opts), want));

/* ---------------- Signals, subsequent references, in-text ---------------- */
test('signal prefix', () => check('signal', full('act', { title: 'Legislative Instruments Act', year: '2003', jur: 'Cth', pin: 's 5' }, { sig: 'Cf' }), 'Cf Legislative Instruments Act 2003 (Cth) s 5.'));
test('subsequent: single author', () => {
  const t = A.TMAP.book, d = A.prep(t, { au: [P('Eric', 'Barendt')], role: 'au', title: 'Freedom of Speech', pub: 'Oxford University Press', edn: '2', year: '2005' }, false);
  check('book (n X)', plain(A.subRef(t, d, 68, '67', '').main), 'Barendt (n 68) 67.');
});
test('subsequent: two authors', () => {
  const t = A.TMAP.book, d = A.prep(t, { au: [P('James', 'Edelman'), P('Elise', 'Bant')], role: 'au', title: 'Unjust Enrichment', pub: 'Hart Publishing', edn: '2', year: '2016' }, false);
  check('two authors (n X)', plain(A.subRef(t, d, 2, '260', '').main), 'Edelman and Bant (n 2) 260.');
});
test('subsequent: editor keeps (ed)', () => {
  const t = A.TMAP.book, d = A.prep(t, { au: [P('Peter', 'Birks')], role: 'eds', title: 'New Perspectives', pub: 'Clarendon Press', year: '1989' }, false);
  check('editor (n X)', plain(A.subRef(t, d, 6, '', '').main), 'Birks (ed) (n 6).');
});
test('subsequent: case short title', () => {
  const t = A.TMAP['case-rep'], d = A.prep(t, { name: 'Penfolds Wines Pty Ltd v Elliott', yb: 'round', year: '1946', vol: '74', rep: 'CLR', page: '204', st: 'Penfolds Wines' }, false);
  check('case (n X)', plain(A.subRef(t, d, 53, '224 (Dixon J)', '').main), 'Penfolds Wines (n 53) 224 (Dixon J).');
});
test('subsequent: Act short title', () => {
  const t = A.TMAP.act, d = A.prep(t, { title: 'Administrative Decisions (Judicial Review) Act', year: '1977', jur: 'Cth', st: 'ADJR Act' }, false);
  check('Act (n X)', plain(A.subRef(t, d, 46, 's 7', '').main), 'ADJR Act (n 46) s 7.');
  check('Act short title is italic', A.subRef(t, d, 46, 's 7', '').main, '<i>ADJR Act</i> (n 46) s 7.');
});
test('subsequent: UN resolution uses doc number', () => {
  const t = A.TMAP.unres, d = A.prep(t, { organ: 'SC Res', num: '1325', doc: 'S/RES/1325', date: '31 October 2000', st: 'Resolution 1325' }, false);
  check('UN (n X)', plain(A.subRef(t, d, 45, 'para 7', '').main), 'Resolution 1325, UN Doc S/RES/1325 (n 45) para 7.');
});
test('in-text: Act first mention', () => {
  const t = A.TMAP.act, d = A.prep(t, { title: 'Property Law Act', year: '1958', jur: 'Vic', st: 'Property Act' }, false);
  check('in-text Act', plain(A.inText(t, d).first), 'Property Law Act 1958 (Vic) (‘Property Act’)');
});

/* ---------------- Formatting details ---------------- */
test('case name italic in HTML', () => {
  const t = A.TMAP['case-rep'];
  check('italic case name', A.fullCite(t, A.prep(t, { name: 'Wirth v Wirth', yb: 'round', year: '1956', vol: '98', rep: 'CLR', page: '228' }, false), ''), '<i>Wirth v Wirth</i> (1956) 98 CLR 228.');
});
test('user input is escaped', () => {
  const t = A.TMAP['case-rep'];
  const html = A.fullCite(t, A.prep(t, { name: '<img src=x onerror=alert(1)> v Smith', yb: 'round', year: '2020', vol: '1', rep: 'CLR', page: '1' }, false), '');
  check('no raw tag', /<img/.test(html), false);
});
test('missing required field shows placeholder', () => {
  check('placeholder', full('act', { title: 'Crimes Act', jur: 'Vic' }), 'Crimes Act [Year] (Vic).');
});
test('dates normalised', () => {
  check('ISO date', full('case-unrep', { name: 'A v B', court: 'Supreme Court of Victoria', jj: 'Smith J', date: '1989-06-29' }), 'A v B (Supreme Court of Victoria, Smith J, 29 June 1989).');
  check('D/M/Y date', full('case-unrep', { name: 'A v B', court: 'Supreme Court of Victoria', jj: 'Smith J', date: '29/06/1989' }), 'A v B (Supreme Court of Victoria, Smith J, 29 June 1989).');
  check('ordinal day stripped', full('case-unrep', { name: 'A v B', court: 'Supreme Court of Victoria', jj: 'Smith J', date: '29th June 1989' }), 'A v B (Supreme Court of Victoria, Smith J, 29 June 1989).');
});

/* ---------------- Bibliography ---------------- */
test('bibliography entry inverts first author, no full stop', () => {
  check('bib journal', bib('journal', { au: [P('James C', 'Hathaway'), P('Audrey', 'Macklin')], title: 'Should We Presume State Protection?', yb: 'round', year: '2016', vol: '32', issue: '3', journal: 'Refuge', status: 'pub', page: '49', pin: '52', st: 'Presume' }),
    'Hathaway, James C and Audrey Macklin, ‘Should We Presume State Protection?’ (2016) 32(3) Refuge 49');
  check('bib case drops pinpoint and judges', bib('case-rep', { name: 'Lane v Morrison', yb: 'round', year: '2009', vol: '239', rep: 'CLR', page: '230', pin: '235', jj: 'French CJ' }), 'Lane v Morrison (2009) 239 CLR 230');
});
test('bibliography ordering (r 1.13)', () => {
  const src = (id, t, d) => ({ id, t, d });
  const J = (au, title, journal) => ({ au, title, yb: 'round', year: '2010', vol: '1', issue: '1', journal, status: 'pub', page: '1' });
  const Bk = (au, title) => ({ au, role: 'au', title, pub: 'Cambridge University Press', year: '2005' });
  const lib = [
    src('1', 'book', Bk([P('James C', 'Hathaway'), P('Michelle', 'Foster')], 'The Law of Refugee Status')),
    src('2', 'journal', J([P('Ian M', 'Ramsay')], 'Corporate Theory and Corporate Law Reform in Australia', 'Agenda')),
    src('3', 'book', Bk([P('Michelle', 'Foster')], 'International Refugee Law and Socio-Economic Rights')),
    src('4', 'journal', J([P('James C', 'Hathaway'), P('Audrey', 'Macklin')], 'Should We Presume State Protection?', 'Refuge')),
    src('5', 'book', Bk([P('James C', 'Hathaway')], 'The Rights of Refugees under International Law')),
    src('6', 'journal', J([P('Ian', 'Ramsay'), P('Cameron', 'Sim')], 'The Role and Use of Debt Agreements', 'Insolvency Law Journal')),
    src('7', 'journal', J([P('Michelle', 'Foster')], 'The Implications of the Failed "Malaysia Solution"', 'Melbourne Journal of International Law')),
    src('8', 'journal', J([P('Oona A', 'Hathaway')], 'International Law at a Crossroads', 'Yale Journal of International Affairs')),
    src('9', 'case-rep', { name: 'Lane v Morrison', yb: 'round', year: '2009', vol: '239', rep: 'CLR', page: '230' }),
    src('10', 'act', { title: 'Access to Medicinal Cannabis Act', year: '2016', jur: 'Vic' }),
  ];
  const groups = A.bibliography(lib, A.TMAP);
  check('sections present', groups.map(g => g.sec).join(''), 'ABC');
  const want = ['Foster, Michelle, ‘The Implications', 'Foster, Michelle, International', 'Hathaway, James C, The Rights', 'Hathaway, James C and Audrey Macklin,', 'Hathaway, James C and Michelle Foster,', 'Hathaway, Oona A,', 'Ramsay, Ian and Cameron Sim,', 'Ramsay, Ian M,'];
  const got = groups[0].entries.map(e => plain(e));
  check('author order', JSON.stringify(got.map((g, i) => g.startsWith(want[i]) ? want[i] : g)), JSON.stringify(want));
  check('same author: title order ignores “The”', /Implications/.test(groups[0].entries[0]), true);
});

/* ---------------- Footnote sequencing ---------------- */
test('sequencer: full → ibid → cross-reference', () => {
  const lib = [
    { id: 'j', t: 'journal', d: { au: [P('Leslie', 'Zines')], title: 'The Inherent Executive Power of the Commonwealth', yb: 'round', year: '2005', vol: '16', issue: '4', journal: 'Public Law Review', status: 'pub', page: '279' } },
    { id: 'c', t: 'case-rep', d: { name: 'McGinty v Western Australia', yb: 'round', year: '1995', vol: '186', rep: 'CLR', page: '140', st: 'McGinty' } },
  ];
  const fns = [{ s: 'j', pin: '280-1' }, { s: 'j', pin: '280-1' }, { s: 'j', pin: '282' }, { s: 'j', pin: '' }, { s: 'c', pin: '185 (Dawson J)', sig: 'See' }, { s: 'c', pin: '186' }, { s: 'j', pin: '283' }];
  const res = A.sequence(lib, fns, A.TMAP);
  check('modes', res.map(r => r.mode).join(','), 'full,ibid,ibid,sub,full,ibid,sub');
  check('fn1', plain(res[0].html), 'Leslie Zines, ‘The Inherent Executive Power of the Commonwealth’ (2005) 16(4) Public Law Review 279, 280–1.');
  check('fn2 same pinpoint', plain(res[1].html), 'Ibid.');
  check('fn3 new pinpoint', plain(res[2].html), 'Ibid 282.');
  check('fn4 no pinpoint after pinpoint → (n X)', plain(res[3].html), 'Zines (n 1).');
  check('fn5 signal', plain(res[4].html), 'See McGinty v Western Australia (1995) 186 CLR 140, 185 (Dawson J) (‘McGinty’).');
  check('fn7 cross-reference', plain(res[6].html), 'Zines (n 1) 283.');
});
test('sequencer: deleted source shows placeholder', () => {
  const res = A.sequence([], [{ s: 'gone', pin: '1' }], A.TMAP);
  check('missing source', res[0].mode, 'x');
});

/* ---------------- Storage & migration ---------------- */
test('storage: empty browser starts empty', () => {
  const api = load(makeStorage());
  const s = api.loadState();
  check('empty lib', s.lib.length, 0);
  check('schema', s.version, 3);
});
test('storage: corrupted JSON falls back to defaults', () => {
  const api = load(makeStorage({ 'pinpoint.aglc4': '{not json' }));
  check('recovers', api.loadState().lib.length, 0);
});
test('storage: v2 data migrates and bad entries are dropped', () => {
  const v2 = { type: 'act', lib: [{ id: 'a', t: 'act', d: { title: 'X Act', year: '2000', jur: 'Cth' } }, { id: 'b', t: 'no-such-type', d: {} }, 'junk', null],
    fns: [{ s: 'a', pin: 's 1' }, { s: 'b', pin: '' }], view: 'hacked', data: { act: 'not an object' } };
  const store = makeStorage({ 'pinpoint.aglc4.v2': JSON.stringify(v2) });
  const api = load(store);
  const s = api.loadState();
  check('kept valid source', s.lib.map(x => x.id).join(), 'a');
  check('dropped footnote to invalid source', s.fns.length, 1);
  check('invalid view reset', s.view, 'gen');
  check('invalid data dropped', s.data.act, undefined);
  check('type kept', s.type, 'act');
  api.saveState(s);
  check('legacy key removed after save', store._map.has('pinpoint.aglc4.v2'), false);
  check('new key written', store._map.has('pinpoint.aglc4'), true);
});
test('storage: blocked or full storage reports failure', () => {
  const api = load(makeStorage({}, { failWrites: true }));
  check('save returns false', api.saveState(api.defaultState()), false);
});
test('export → import round trip, duplicates skipped', () => {
  const s = A.defaultState();
  s.lib = [{ id: 'x1', t: 'act', d: { title: 'Crimes Act', year: '1958', jur: 'Vic' } }];
  s.fns = [{ s: 'x1', pin: 's 3', sig: '' }];
  const file = JSON.stringify(A.exportLibrary(s));
  const target = A.defaultState();
  const r1 = A.importLibrary(target, file);
  check('added', r1.added, 1); check('footnotes', r1.footnotes, 1);
  const r2 = A.importLibrary(target, file);
  check('duplicate skipped', r2.added, 0);
  check('lib size', target.lib.length, 1);
  let msg = ''; try { A.importLibrary(target, '{"hello":1}'); } catch (e) { msg = e.message; }
  check('rejects non-export', /isn’t a Pinpoint library/.test(msg), true);
});

/* ---------------- Every type renders its own example without throwing ---------------- */
test('all example data renders', () => {
  for (const t of Object.values(A.TMAP)) {
    const d = A.prep(t, JSON.parse(JSON.stringify(t.ex)), false);
    const out = A.fullCite(t, d, '');
    if (/undefined|\[object/.test(out)) check(`${t.id} example clean`, out, '(no "undefined")');
    A.bibEntry(t, t.ex); A.inText(t, d); A.subRef(t, d, 1, '', '');
    pass++;
  }
});

console.log(failures.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
