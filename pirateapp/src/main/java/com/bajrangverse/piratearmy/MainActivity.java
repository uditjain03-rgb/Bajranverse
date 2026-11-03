package com.bajrangverse.piratearmy;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowManager;
import android.webkit.*;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

// Rocky's Pirate Army: the WebGL game (assets/index.html) in a fullscreen WebView.
// JS bridge `PirateNative`: vibrate(ms), adReady(), showRewarded(tag), showInterstitial(). When an ad closes the game is
// told with window.onAdDone(tag, rewarded). The game is told when the app pauses / resumes (window.onAppPause /
// onAppResume) and asked what the back button should do (window.onBack returns 'exit' or 'stay').
// Ads: Google AdMob. The ad unit IDs below are Google's public TEST IDs; replace them (and the app ID in
// AndroidManifest.xml) with your own AdMob IDs before publishing.
public class MainActivity extends Activity {
  static final String REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";      // TEST rewarded ad unit
  static final String INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";  // TEST interstitial ad unit
  private WebView web;
  private RewardedAd rewarded;
  private InterstitialAd inter;
  private boolean earned;

  @Override public void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    web = new WebView(this);
    web.setBackgroundColor(0xFF000000 | 0xC2410C);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(false); s.setAllowContentAccess(false);
    s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
    // the game's files are served from https://appassets.androidplatform.net/assets/ (a secure, app-only address)
    final WebViewAssetLoader assets = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
    s.setMediaPlaybackRequiresUserGesture(false);
    web.setWebViewClient(new WebViewClient() {   // the game never navigates away from its own files
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return assets.shouldInterceptRequest(r.getUrl()); }
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !r.getUrl().toString().startsWith("https://appassets.androidplatform.net/"); }
    });
    web.setWebChromeClient(new WebChromeClient());
    WebView.setWebContentsDebuggingEnabled(false);
    web.addJavascriptInterface(new NativeBridge(), "PirateNative");
    web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    setContentView(web);
    hideSystemUi();
    MobileAds.initialize(this, st -> { loadRewarded(); loadInterstitial(); });
  }

  private void loadRewarded() {
    RewardedAd.load(this, REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
      @Override public void onAdLoaded(@NonNull RewardedAd ad) { rewarded = ad; }
      @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { rewarded = null; web.postDelayed(() -> loadRewarded(), 30000); }
    });
  }
  private void loadInterstitial() {
    InterstitialAd.load(this, INTERSTITIAL_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
      @Override public void onAdLoaded(@NonNull InterstitialAd ad) { inter = ad; }
      @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { inter = null; web.postDelayed(() -> loadInterstitial(), 60000); }
    });
  }
  private void tellGame(String tag, boolean ok) { web.evaluateJavascript("window.onAdDone&&window.onAdDone('" + tag + "'," + ok + ")", null); }

  private void hideSystemUi() {
    web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
  }

  @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideSystemUi(); }
  @Override protected void onPause() { super.onPause(); web.evaluateJavascript("window.onAppPause&&window.onAppPause()", null); web.onPause(); }
  @Override protected void onResume() { super.onResume(); web.onResume(); web.evaluateJavascript("window.onAppResume&&window.onAppResume()", null); }

  @Override public void onBackPressed() {
    web.evaluateJavascript("window.onBack?window.onBack():'exit'", v -> { if (v == null || v.contains("exit")) finish(); });
  }

  public class NativeBridge {
    @JavascriptInterface public void vibrate(int ms) {
      Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
      if (v == null) return;
      if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
      else v.vibrate(ms);
    }
    @JavascriptInterface public boolean adReady() { return rewarded != null; }
    // a rewarded ad: the player chose to watch it for a reward (keep going, double coins)
    @JavascriptInterface public void showRewarded(String tag) {
      runOnUiThread(() -> {
        if (rewarded == null) { tellGame(tag, false); return; }
        earned = false;
        rewarded.setFullScreenContentCallback(new FullScreenContentCallback() {
          @Override public void onAdDismissedFullScreenContent() { rewarded = null; tellGame(tag, earned); loadRewarded(); }
          @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) { rewarded = null; tellGame(tag, false); loadRewarded(); }
        });
        rewarded.show(MainActivity.this, item -> earned = true);
      });
    }
    // a short ad between levels (the game asks for one only every few levels)
    @JavascriptInterface public void showInterstitial() {
      runOnUiThread(() -> {
        if (inter == null) { tellGame("inter", false); return; }
        inter.setFullScreenContentCallback(new FullScreenContentCallback() {
          @Override public void onAdDismissedFullScreenContent() { inter = null; tellGame("inter", true); loadInterstitial(); }
          @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) { inter = null; tellGame("inter", false); loadInterstitial(); }
        });
        inter.show(MainActivity.this);
      });
    }
  }
}
