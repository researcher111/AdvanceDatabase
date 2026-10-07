"""Check the revised teaching order, deadlines, bonus boundaries, and local links."""
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.hrefs=[]; self.ids=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag == 'a' and 'href' in attrs: self.hrefs.append(attrs['href'])
        if 'id' in attrs: self.ids.append(attrs['id'])


class RevisedScheduleTests(unittest.TestCase):
    def test_required_sequence_dates_and_quizzes(self):
        html=(ROOT/'schedule.html').read_text()
        main=html.split('<table class="schedule">')[1].split('</table>')[0]
        for resource in ['lecture-07/wal','lecture-08/concurrency','lecture-09/optimizer','lab-07/transactions']:
            self.assertNotIn(resource,main)
            self.assertIn(resource,html.split('<section id="bonus">')[1])
        rows=re.findall(r'<tr class="day-[^"]+">.*?</tr>',main,re.S)
        self.assertEqual(len(rows),29)
        dates={}
        for i,row in enumerate(rows,1):
            self.assertIn(f'Day {i}<',row)
            date=re.search(r'<td class="date">(.*?)</td>',row)[1]
            actual=datetime.strptime(date+' 2026','%a %b %d %Y')
            self.assertEqual(actual.strftime('%a'),date[:3]);dates[date]=row
        self.assertIn('lecture-10/analytics.html',dates['Thu Oct 8'])
        self.assertIn('lab-08/duckdb.html',dates['Tue Oct 13'])
        self.assertIn('lecture-11/vectors.html',dates['Thu Oct 15'])
        self.assertIn('lectures/review/midterm.html',dates['Tue Oct 20'])
        self.assertIn('full 75-minute session',dates['Tue Oct 20'])
        self.assertNotIn('lab-09/microvector.html',dates['Tue Oct 20'])
        for date, resource in [
            ('Tue Oct 27', 'lecture-12/rag.html'),
            ('Thu Oct 29', 'lab-09/microvector.html'),
            ('Tue Nov 3', 'lab-10/microrag.html'),
            ('Thu Nov 5', 'lecture-13/distributed.html'),
            ('Tue Nov 10', 'lab-11/sparkray.html'),
            ('Thu Nov 12', 'lecture-14/bigtable.html'),
            ('Tue Nov 17', 'lecture-15/graphs.html'),
        ]:
            self.assertIn(resource,dates[date])
        self.assertIn('discovery/index.html#city',dates['Thu Nov 19'])
        self.assertIn('discovery/index.html#weather',dates['Thu Nov 19'])
        self.assertIn('Midterm exam',dates['Thu Oct 22'])
        self.assertIn('Lectures 1–6 and Labs 1–6',dates['Thu Oct 22'])
        self.assertEqual(re.findall(r'Quiz (\d+) ·',main),[str(i) for i in range(1,12)])
        for date,text in [('Tue Oct 20','Lab 8'),('Thu Nov 5','Lab 9'),('Tue Nov 10','Lab 10'),('Tue Nov 17','Lab 11')]:
            self.assertIn(text,dates[date].split('<td class="due">')[1])
        for date,text in [('Thu Oct 29','proposal due'),('Thu Nov 12','retrieval working'),('Thu Nov 19','question swap'),('Tue Dec 8','Final project presentations')]:
            self.assertIn(text,dates[date])

    def test_shifted_pages_and_decks_match_the_schedule(self):
        for file, date, deadline in [
            ('labs/lab-09/microvector.html', 'Thursday October 29, 2026', 'Thursday Nov 5 at class start'),
            ('labs/lab-10/microrag.html', 'Tuesday November 3, 2026', 'Tuesday Nov 10 at class start'),
            ('labs/lab-11/sparkray.html', 'Tuesday November 10, 2026', 'Tuesday Nov 17 at class start'),
        ]:
            page=(ROOT/file).read_text()
            self.assertIn(date,page);self.assertIn(deadline,page)
        deck=(ROOT/'slides/decks/lectures-11-15.js').read_text()
        for number, name, slug, date, iso in [
            (13,'Distributed compute','distributed','Thursday November 5, 2026','2026-11-05'),
            (14,'Bigtable and LSM trees','bigtable','Thursday November 12, 2026','2026-11-12'),
            (15,'Graphs and course synthesis','graphs','Tuesday November 17, 2026','2026-11-17'),
        ]:
            self.assertIn(date,(ROOT/f'lectures/lecture-{number}/{slug}.html').read_text())
            self.assertIn(f"register({number},'{name}','{iso}'",deck)

    def test_new_and_changed_pages_have_working_local_links(self):
        pages=['index.html','schedule.html','slides/index.html','lectures/lecture-10/discovery.html']
        pages += [str(p.relative_to(ROOT)) for base in ['lectures','labs'] for p in (ROOT/base).glob('*/*.html')]
        for name in pages:
            parser=Links();parser.feed((ROOT/name).read_text())
            self.assertEqual(len(parser.ids),len(set(parser.ids)),name+' has unique static IDs')
            for href in parser.hrefs:
                url=urlsplit(href)
                if url.scheme or url.netloc or not url.path: continue
                target=(ROOT/name).parent/unquote(url.path)
                self.assertTrue(target.exists(),name+' → '+href)

    def test_bonus_lab_has_no_submission_deadline(self):
        page=(ROOT/'labs/lab-07/transactions.html').read_text()
        self.assertIn('optional and ungraded',page)
        self.assertNotIn('Tuesday Oct 20',page)
        self.assertNotIn('Submit <code>transaction.py</code> to Gradescope',page)


if __name__ == '__main__': unittest.main()
