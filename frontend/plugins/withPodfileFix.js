const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fix for Expo SDK 54 Podfile error:
 * "no implicit conversion of String into Integer"
 * 
 * This plugin modifies the Podfile to fix the use_native_modules! call
 */
const withPodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Fix the use_native_modules! call
        podfileContent = podfileContent.replace(
          /config = use_native_modules!\(config_command\)/g,
          'config = use_native_modules!'
        );
        
        fs.writeFileSync(podfilePath, podfileContent);
        console.log('[withPodfileFix] Fixed use_native_modules! in Podfile');
      }
      
      return config;
    },
  ]);
};

module.exports = withPodfileFix;
