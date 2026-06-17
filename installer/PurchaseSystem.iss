; Inno Setup script — Purchase Web System installer
; Build via: iscc PurchaseSystem.iss (or installer\build-installer.ps1)

#define MyAppName "نظام المشتريات"
#define MyAppNameEn "Purchase Web System"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "PurchaseWebSystem"
#define MyAppURL "https://github.com/AliHammadi2108/RoyanProjects"
#define StagingDir "staging\app"

[Setup]
AppId={{C8D9E0F1-A2B3-4C5D-9E8F-123456789ABC}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\PurchaseWebSystem
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=PurchaseSystem-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\installer\start-installed.bat
LicenseFile=assets\License.rtf
InfoAfterFile=assets\after-install.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "إنشاء اختصار على سطح المكتب"; GroupDescription: "اختصارات:"; Flags: unchecked

[Files]
Source: "{#StagingDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\installer\start-installed.bat"; WorkingDir: "{app}"; Comment: "{#MyAppNameEn}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\installer\start-installed.bat"; WorkingDir: "{app}"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\installer\post-install.ps1"" -InstallDir ""{app}"" -SkipShortcuts"; StatusMsg: "إعداد Node.js و npm و Prisma..."; Flags: waituntilterminated runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\.next"
Type: files; Name: "{app}\.env"

[Code]
function InitializeSetup: Boolean;
begin
  Result := True;
end;
