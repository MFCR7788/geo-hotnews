const fs = require('fs');
const path = require('path');

const files = [
  {file: 'pages/geo/knowledge/KnowledgeView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/video/VideoCenterView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/video/VideoCreateView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/notifications/NotificationsView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/content/ContentGenerateView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/content/ContentListView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/geo-check/GeoCheckView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/monitor/MonitorView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/content/ContentCalendarView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/video/VideoAssetsView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/video/VideoPublishView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/geo-check/ReportsView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/geo-check/GeoReportsView.tsx', imp: "import GuideTabs from '../../components/ui/GuideTabs'"},
  {file: 'pages/geo/settings/SettingsProfileView.tsx', imp: "import GuideTabs from '../../../components/ui/GuideTabs'"},
  {file: 'pages/geo/settings/SettingsTenantView.tsx', imp: "import GuideTabs from '../../../components/ui/GuideTabs'"},
  {file: 'pages/geo/settings/SettingsKnowledgeView.tsx', imp: "import GuideTabs from '../../../components/ui/GuideTabs'"},
  {file: 'pages/geo/settings/SettingsApiView.tsx', imp: "import GuideTabs from '../../../components/ui/GuideTabs'"},
  {file: 'pages/geo/settings/SettingsSubscriptionView.tsx', imp: "import GuideTabs from '../../../components/ui/GuideTabs'"},
];

let ok = 0, skip = 0, fail = 0;
const baseDir = '/Users/aplle/Documents/Zjsifan/Tools/Geo-hotnews/client/src';

files.forEach(f => {
  const fullPath = path.join(baseDir, f.file);
  try {
    if (!fs.existsSync(fullPath)) {
      fail++;
      console.log('❌ ' + f.file + ' (not found)');
      return;
    }
    let content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('GuideTabs')) {
      skip++;
      console.log('⏭️ ' + f.file);
      return;
    }
    
    // Add import after first import line
    const firstImportIdx = content.indexOf('import ');
    if (firstImportIdx === -1) {
      fail++;
      console.log('❌ ' + f.file + ' (no import found)');
      return;
    }
    const endOfFirstImport = content.indexOf('\n', firstImportIdx);
    content = content.slice(0, endOfFirstImport + 1) + f.imp + '\n' + content.slice(endOfFirstImport + 1);
    
    // Find last </div> before final ) of return and insert <GuideTabs />
    const lines = content.split('\n');
    let lastDivClose = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (trimmed === '</div>' && i + 1 < lines.length && lines[i + 1].trim() === ')') {
        lastDivClose = i;
        break;
      }
    }
    if (lastDivClose === -1) {
      fail++;
      console.log('❌ ' + f.file + ' (no closing div found)');
      return;
    }
    
    lines.splice(lastDivClose + 1, 0 '', '      <GuideTabs />');
    content = lines.join('\n');
    fs.writeFileSync(fullPath, content, 'utf8');
    ok++;
    console.log('✅ ' + f.file);
  } catch(e) {
    fail++;
    console.log('❌ ' + f.file + ' (' + e.message + ')');
  }
});

console.log('\n=== Done: ✅' + ok + ' ⏭️' + skip + ' ❌' + fail + ' ===');
