const { withMainActivity } = require('expo/config-plugins');

/**
 * Requests the highest supported display refresh rate (e.g. 90Hz/120Hz/144Hz)
 * on Android 11+ devices by selecting the highest-fps Display.Mode matching
 * the current physical resolution.
 */
function withHighRefreshRate(config) {
  return withMainActivity(config, (mod) => {
    let contents = mod.modResults.contents;

    const importLine = 'import android.view.WindowManager';
    if (!contents.includes(importLine)) {
      contents = contents.replace(
        'import android.os.Bundle',
        `import android.os.Bundle\n${importLine}`
      );
    }

    const helperMethod = `
  private fun requestHighRefreshRate() {
    try {
      val currentDisplay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        display
      } else {
        @Suppress("DEPRECATION")
        windowManager.defaultDisplay
      } ?: return

      val currentMode = currentDisplay.mode
      val bestMode = currentDisplay.supportedModes
        .filter {
          it.physicalWidth == currentMode.physicalWidth &&
            it.physicalHeight == currentMode.physicalHeight
        }
        .maxByOrNull { it.refreshRate } ?: return

      val params = window.attributes
      if (params.preferredDisplayModeId != bestMode.modeId ||
        params.preferredRefreshRate != bestMode.refreshRate
      ) {
        params.preferredDisplayModeId = bestMode.modeId
        params.preferredRefreshRate = bestMode.refreshRate
        window.attributes = params
      }
    } catch (_: Throwable) {
      // Gracefully ignore on unsupported devices
    }
  }
`;

    if (!contents.includes('private fun requestHighRefreshRate()')) {
      contents = contents.replace(
        'super.onCreate(null)',
        'super.onCreate(null)\n    requestHighRefreshRate()'
      );

      if (!contents.includes('override fun onResume()')) {
        contents = contents.replace(
          'override fun getMainComponentName()',
          `override fun onResume() {\n    super.onResume()\n    requestHighRefreshRate()\n  }\n${helperMethod}\n  override fun getMainComponentName()`
        );
      } else {
        contents = contents.replace(
          'override fun getMainComponentName()',
          `${helperMethod}\n  override fun getMainComponentName()`
        );
      }
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = withHighRefreshRate;
