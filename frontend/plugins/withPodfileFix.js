const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for Expo SDK 54 iOS Build errors:
 * 1. "no implicit conversion of String into Integer" - Podfile fix
 * 2. "ReactAppDependencyProvider" not found - New Architecture fix
 */
const withPodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Fix 1: use_native_modules! call
        podfileContent = podfileContent.replace(
          /config = use_native_modules!\(config_command\)/g,
          'config = use_native_modules!'
        );
        
        // Fix 2: Remove or comment out ReactAppDependencyProvider dependency
        podfileContent = podfileContent.replace(
          /pod 'ReactAppDependencyProvider',.*\n/g,
          "# ReactAppDependencyProvider removed for old arch compatibility\n"
        );
        
        // Fix 3: Ensure new architecture is disabled in Podfile
        if (!podfileContent.includes('ENV[\'RCT_NEW_ARCH_ENABLED\']')) {
          const targetLine = "platform :ios";
          const envDisable = "ENV['RCT_NEW_ARCH_ENABLED'] = '0'\n\n";
          podfileContent = podfileContent.replace(targetLine, envDisable + targetLine);
        }
        
        fs.writeFileSync(podfilePath, podfileContent);
        console.log('[withPodfileFix] Applied iOS Podfile fixes');
      }
      
      return config;
    },
  ]);
};

module.exports = withPodfileFix;
