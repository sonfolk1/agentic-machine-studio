#!/usr/bin/env node
// Generates AgenticStudioMobile.xcodeproj/project.pbxproj by scanning the
// AgenticStudioMobile/ source tree. No external dependencies — pure Node.
//
// Run: `node scripts/genproj.js` from the project root.
// Re-run any time you add/remove Swift files; the rest of the project file
// (build settings, scheme, etc.) is fully deterministic.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'AgenticStudioMobile');
const PROJ_DIR = path.join(ROOT, 'AgenticStudioMobile.xcodeproj');
const APP_NAME = 'AgenticStudioMobile';
const BUNDLE_ID = 'com.agenticstudio.mobile';

// Deterministic 24-char hex UUIDs from a string seed.
function uuid(role, ...parts) {
  const h = crypto.createHash('sha1').update([role, ...parts].join('\0')).digest('hex').toUpperCase();
  return h.slice(0, 24);
}

// Walk the source tree, collect .swift files and pseudo-resources.
function walk(dir, prefix = '') {
  const out = { dirs: [], files: [] };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // Treat .xcassets as a single resource, not a group.
      if (entry.name.endsWith('.xcassets')) {
        out.files.push({ rel, kind: 'asset' });
      } else {
        const inner = walk(abs, rel);
        out.dirs.push({ name: entry.name, rel, ...inner });
      }
    } else if (entry.name.endsWith('.swift')) {
      out.files.push({ rel, kind: 'swift' });
    } else if (entry.name === 'Info.plist') {
      out.files.push({ rel, kind: 'plist' });
    }
  }
  // Stable sort so re-runs are diff-friendly.
  out.dirs.sort((a, b) => a.name.localeCompare(b.name));
  out.files.sort((a, b) => a.rel.localeCompare(b.rel));
  return out;
}

const tree = walk(SRC_DIR);

const refs = { files: [], builds: [], groups: [], resources: [] };

function fileRef(rel, kind) {
  const id = uuid('file', rel);
  const baseName = path.basename(rel);
  let lastKnown;
  switch (kind) {
    case 'swift': lastKnown = 'sourcecode.swift'; break;
    case 'plist': lastKnown = 'text.plist.xml'; break;
    case 'asset': lastKnown = 'folder.assetcatalog'; break;
    default:      lastKnown = 'text';
  }
  refs.files.push({ id, name: baseName, path: baseName, lastKnown });
  return id;
}

function buildFile(fileId, asResource = false) {
  const id = uuid('build', fileId, asResource ? 'r' : 's');
  refs.builds.push({ id, fileId });
  if (asResource) refs.resources.push(id);
  return id;
}

// Walk again, this time creating refs and groups in parallel.
function processNode(node, isRoot = false, name = APP_NAME) {
  const childIds = [];
  for (const sub of node.dirs) {
    childIds.push(processNode(sub, false, sub.name));
  }
  for (const f of node.files) {
    const fid = fileRef(f.rel, f.kind);
    childIds.push(fid);
    if (f.kind === 'swift') buildFile(fid, false);
    else if (f.kind === 'asset') buildFile(fid, true);
  }
  const groupId = uuid('group', isRoot ? '__root__' : name + '|' + node.rel || '');
  refs.groups.push({
    id: groupId,
    name,
    children: childIds,
    isRoot,
    path: isRoot ? APP_NAME : name,
  });
  return groupId;
}
const sourceGroupId = processNode(tree, true);

// Products group + main group
const productsGroupId = uuid('group', '__products__');
const productRefId    = uuid('file', `${APP_NAME}.app`);
refs.groups.push({
  id: productsGroupId,
  name: 'Products',
  children: [productRefId],
  isRoot: false,
  noPath: true,
});
const mainGroupId = uuid('group', '__main__');
refs.groups.push({
  id: mainGroupId,
  name: null,
  children: [sourceGroupId, productsGroupId],
  isRoot: false,
  noPath: true,
});

// Top-level IDs.
const projectId        = uuid('project', APP_NAME);
const targetId         = uuid('target', APP_NAME);
const sourcesPhaseId   = uuid('phase', 'sources');
const resourcesPhaseId = uuid('phase', 'resources');
const frameworksPhaseId = uuid('phase', 'frameworks');
const projectConfigListId = uuid('cfglist', 'project');
const targetConfigListId  = uuid('cfglist', 'target');
const projectDebugId   = uuid('cfg', 'project-debug');
const projectReleaseId = uuid('cfg', 'project-release');
const targetDebugId    = uuid('cfg', 'target-debug');
const targetReleaseId  = uuid('cfg', 'target-release');

const sourceBuildIds   = refs.builds.filter((b) => !refs.resources.includes(b.id)).map((b) => b.id);
const resourceBuildIds = refs.resources;

// Render the pbxproj as a single string.
let out = '';
const p = (s) => { out += s + '\n'; };

p('// !$*UTF8*$!');
p('{');
p('\tarchiveVersion = 1;');
p('\tclasses = {');
p('\t};');
p('\tobjectVersion = 56;');
p('\tobjects = {');

// PBXBuildFile
p('');
p('/* Begin PBXBuildFile section */');
for (const b of refs.builds) {
  p(`\t\t${b.id} /* build */ = {isa = PBXBuildFile; fileRef = ${b.fileId} /* */; };`);
}
p('/* End PBXBuildFile section */');

// PBXFileReference (all source files + products)
p('');
p('/* Begin PBXFileReference section */');
for (const f of refs.files) {
  p(`\t\t${f.id} /* ${f.name} */ = {isa = PBXFileReference; lastKnownFileType = ${f.lastKnown}; path = "${f.path}"; sourceTree = "<group>"; };`);
}
// Product
p(`\t\t${productRefId} /* ${APP_NAME}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "${APP_NAME}.app"; sourceTree = BUILT_PRODUCTS_DIR; };`);
p('/* End PBXFileReference section */');

// PBXFrameworksBuildPhase
p('');
p('/* Begin PBXFrameworksBuildPhase section */');
p(`\t\t${frameworksPhaseId} /* Frameworks */ = {`);
p('\t\t\tisa = PBXFrameworksBuildPhase;');
p('\t\t\tbuildActionMask = 2147483647;');
p('\t\t\tfiles = (');
p('\t\t\t);');
p('\t\t\trunOnlyForDeploymentPostprocessing = 0;');
p('\t\t};');
p('/* End PBXFrameworksBuildPhase section */');

// PBXGroup
p('');
p('/* Begin PBXGroup section */');
for (const g of refs.groups) {
  p(`\t\t${g.id} /* ${g.name || ''} */ = {`);
  p('\t\t\tisa = PBXGroup;');
  p('\t\t\tchildren = (');
  for (const c of g.children) {
    p(`\t\t\t\t${c} /* */,`);
  }
  p('\t\t\t);');
  if (g.name && !g.noPath && !g.isRoot) p(`\t\t\tpath = "${g.name}";`);
  else if (g.isRoot)                    p(`\t\t\tpath = "${APP_NAME}";`);
  else if (g.name)                      p(`\t\t\tname = "${g.name}";`);
  p('\t\t\tsourceTree = "<group>";');
  p('\t\t};');
}
p('/* End PBXGroup section */');

// PBXNativeTarget
p('');
p('/* Begin PBXNativeTarget section */');
p(`\t\t${targetId} /* ${APP_NAME} */ = {`);
p('\t\t\tisa = PBXNativeTarget;');
p(`\t\t\tbuildConfigurationList = ${targetConfigListId} /* */;`);
p('\t\t\tbuildPhases = (');
p(`\t\t\t\t${sourcesPhaseId} /* Sources */,`);
p(`\t\t\t\t${frameworksPhaseId} /* Frameworks */,`);
p(`\t\t\t\t${resourcesPhaseId} /* Resources */,`);
p('\t\t\t);');
p('\t\t\tbuildRules = (');
p('\t\t\t);');
p('\t\t\tdependencies = (');
p('\t\t\t);');
p(`\t\t\tname = "${APP_NAME}";`);
p(`\t\t\tproductName = "${APP_NAME}";`);
p(`\t\t\tproductReference = ${productRefId} /* */;`);
p('\t\t\tproductType = "com.apple.product-type.application";');
p('\t\t};');
p('/* End PBXNativeTarget section */');

// PBXProject
p('');
p('/* Begin PBXProject section */');
p(`\t\t${projectId} /* Project object */ = {`);
p('\t\t\tisa = PBXProject;');
p('\t\t\tattributes = {');
p('\t\t\t\tLastSwiftUpdateCheck = 1600;');
p('\t\t\t\tLastUpgradeCheck = 1600;');
p('\t\t\t};');
p(`\t\t\tbuildConfigurationList = ${projectConfigListId} /* */;`);
p('\t\t\tcompatibilityVersion = "Xcode 14.0";');
p('\t\t\tdevelopmentRegion = en;');
p('\t\t\thasScannedForEncodings = 0;');
p('\t\t\tknownRegions = (');
p('\t\t\t\ten,');
p('\t\t\t\tBase,');
p('\t\t\t);');
p(`\t\t\tmainGroup = ${mainGroupId} /* */;`);
p(`\t\t\tproductRefGroup = ${productsGroupId} /* Products */;`);
p('\t\t\tprojectDirPath = "";');
p('\t\t\tprojectRoot = "";');
p('\t\t\ttargets = (');
p(`\t\t\t\t${targetId} /* ${APP_NAME} */,`);
p('\t\t\t);');
p('\t\t};');
p('/* End PBXProject section */');

// PBXResourcesBuildPhase
p('');
p('/* Begin PBXResourcesBuildPhase section */');
p(`\t\t${resourcesPhaseId} /* Resources */ = {`);
p('\t\t\tisa = PBXResourcesBuildPhase;');
p('\t\t\tbuildActionMask = 2147483647;');
p('\t\t\tfiles = (');
for (const id of resourceBuildIds) p(`\t\t\t\t${id} /* */,`);
p('\t\t\t);');
p('\t\t\trunOnlyForDeploymentPostprocessing = 0;');
p('\t\t};');
p('/* End PBXResourcesBuildPhase section */');

// PBXSourcesBuildPhase
p('');
p('/* Begin PBXSourcesBuildPhase section */');
p(`\t\t${sourcesPhaseId} /* Sources */ = {`);
p('\t\t\tisa = PBXSourcesBuildPhase;');
p('\t\t\tbuildActionMask = 2147483647;');
p('\t\t\tfiles = (');
for (const id of sourceBuildIds) p(`\t\t\t\t${id} /* */,`);
p('\t\t\t);');
p('\t\t\trunOnlyForDeploymentPostprocessing = 0;');
p('\t\t};');
p('/* End PBXSourcesBuildPhase section */');

// XCBuildConfiguration (project)
function emitProjectConfig(id, name, isDebug) {
  p(`\t\t${id} /* ${name} */ = {`);
  p('\t\t\tisa = XCBuildConfiguration;');
  p('\t\t\tbuildSettings = {');
  p('\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;');
  p('\t\t\t\tASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;');
  p('\t\t\t\tCLANG_ANALYZER_NONNULL = YES;');
  p('\t\t\t\tCLANG_ANALYZER_NUMBER_OBJECT_CONVERSION = YES_AGGRESSIVE;');
  p('\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";');
  p('\t\t\t\tCLANG_ENABLE_MODULES = YES;');
  p('\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;');
  p('\t\t\t\tCLANG_ENABLE_OBJC_WEAK = YES;');
  p('\t\t\t\tCOPY_PHASE_STRIP = NO;');
  p('\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";');
  if (isDebug) {
    p('\t\t\t\tENABLE_TESTABILITY = YES;');
    p('\t\t\t\tONLY_ACTIVE_ARCH = YES;');
    p('\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;');
    p('\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;');
    p('\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;');
    p('\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = ("DEBUG=1", "$(inherited)");');
    p('\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;');
    p('\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";');
    p('\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";');
  } else {
    p('\t\t\t\tENABLE_NS_ASSERTIONS = NO;');
    p('\t\t\t\tMTL_ENABLE_DEBUG_INFO = NO;');
    p('\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;');
    p('\t\t\t\tVALIDATE_PRODUCT = YES;');
  }
  p('\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;');
  p('\t\t\t\tENABLE_USER_SCRIPT_SANDBOXING = YES;');
  p('\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;');
  p('\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;');
  p('\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;');
  p('\t\t\t\tLOCALIZATION_PREFERS_STRING_CATALOGS = YES;');
  p('\t\t\t\tMTL_FAST_MATH = YES;');
  p('\t\t\t\tSDKROOT = iphoneos;');
  p('\t\t\t\tSWIFT_VERSION = 5.0;');
  p('\t\t\t};');
  p(`\t\t\tname = ${name};`);
  p('\t\t};');
}

function emitTargetConfig(id, name, isDebug) {
  p(`\t\t${id} /* ${name} */ = {`);
  p('\t\t\tisa = XCBuildConfiguration;');
  p('\t\t\tbuildSettings = {');
  p('\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;');
  p('\t\t\t\tASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;');
  p('\t\t\t\tCODE_SIGN_STYLE = Automatic;');
  p('\t\t\t\tCURRENT_PROJECT_VERSION = 1;');
  p('\t\t\t\tENABLE_PREVIEWS = YES;');
  p('\t\t\t\tGENERATE_INFOPLIST_FILE = NO;');
  p(`\t\t\t\tINFOPLIST_FILE = "${APP_NAME}/Info.plist";`);
  p('\t\t\t\tINFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;');
  p('\t\t\t\tINFOPLIST_KEY_UILaunchScreen_Generation = YES;');
  p('\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPad = "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";');
  p('\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone = "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight";');
  p('\t\t\t\tLD_RUNPATH_SEARCH_PATHS = ("$(inherited)", "@executable_path/Frameworks");');
  p('\t\t\t\tMARKETING_VERSION = 0.1.0;');
  p(`\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "${BUNDLE_ID}";`);
  p('\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";');
  p('\t\t\t\tSUPPORTED_PLATFORMS = "iphoneos iphonesimulator";');
  p('\t\t\t\tSUPPORTS_MACCATALYST = NO;');
  p('\t\t\t\tSUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = NO;');
  p('\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;');
  p('\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";');
  p('\t\t\t};');
  p(`\t\t\tname = ${name};`);
  p('\t\t};');
}

p('');
p('/* Begin XCBuildConfiguration section */');
emitProjectConfig(projectDebugId,   'Debug',   true);
emitProjectConfig(projectReleaseId, 'Release', false);
emitTargetConfig(targetDebugId,     'Debug',   true);
emitTargetConfig(targetReleaseId,   'Release', false);
p('/* End XCBuildConfiguration section */');

// XCConfigurationList
p('');
p('/* Begin XCConfigurationList section */');
p(`\t\t${projectConfigListId} /* Project configuration list */ = {`);
p('\t\t\tisa = XCConfigurationList;');
p('\t\t\tbuildConfigurations = (');
p(`\t\t\t\t${projectDebugId} /* Debug */,`);
p(`\t\t\t\t${projectReleaseId} /* Release */,`);
p('\t\t\t);');
p('\t\t\tdefaultConfigurationIsVisible = 0;');
p('\t\t\tdefaultConfigurationName = Release;');
p('\t\t};');
p(`\t\t${targetConfigListId} /* Target configuration list */ = {`);
p('\t\t\tisa = XCConfigurationList;');
p('\t\t\tbuildConfigurations = (');
p(`\t\t\t\t${targetDebugId} /* Debug */,`);
p(`\t\t\t\t${targetReleaseId} /* Release */,`);
p('\t\t\t);');
p('\t\t\tdefaultConfigurationIsVisible = 0;');
p('\t\t\tdefaultConfigurationName = Release;');
p('\t\t};');
p('/* End XCConfigurationList section */');

p('\t};');
p(`\trootObject = ${projectId} /* Project object */;`);
p('}');

fs.mkdirSync(PROJ_DIR, { recursive: true });
fs.writeFileSync(path.join(PROJ_DIR, 'project.pbxproj'), out, 'utf8');
console.log(`wrote ${path.relative(ROOT, path.join(PROJ_DIR, 'project.pbxproj'))} (${refs.builds.length} build files)`);

// Patch the shared scheme to point at the real target UUID.
const schemePath = path.join(PROJ_DIR, 'xcshareddata', 'xcschemes', `${APP_NAME}.xcscheme`);
if (fs.existsSync(schemePath)) {
  let scheme = fs.readFileSync(schemePath, 'utf8');
  scheme = scheme.replace(/BlueprintIdentifier = "[^"]+"/g, `BlueprintIdentifier = "${targetId}"`);
  fs.writeFileSync(schemePath, scheme, 'utf8');
  console.log(`patched ${path.relative(ROOT, schemePath)}`);
}
