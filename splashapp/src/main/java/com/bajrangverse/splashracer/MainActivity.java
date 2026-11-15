package com.bajrangverse.splashracer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Debug;
import android.util.Base64;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
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
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

// Splash Racer: the WebGL game (assets/index.html) in a fullscreen WebView.
// JS bridge `GameNative`: vibrate(ms), adReady(), showRewarded(tag), sign/check (saved progress). When an ad closes the game is
// told with window.onAdDone(tag, rewarded). The game is told when the app pauses / resumes (window.onAppPause /
// onAppResume) and asked what the back button should do (window.onBack returns 'exit' or 'stay').
// Ads: Google AdMob, REWARDED ONLY (the player chooses to watch one for a reward; there are no ads during the game).
// The ad unit ID below is Google's public TEST ID; replace it (and the app ID in AndroidManifest.xml) with your own
// AdMob IDs before publishing: see ADS_AND_EARNING_GUIDE.md.
// Protection: the game code ships encrypted (assets/game.bin, see drive-src/tools/seal.mjs) and is decrypted in memory
// only; the app refuses to run if it was re-signed (modded), is debuggable or has a debugger attached; saved progress
// is signed (HMAC) so editing it resets it.
public class MainActivity extends Activity {
  static final String REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";      // TEST rewarded ad unit
  private WebView web;
  private RewardedAd rewarded;
  private byte[] gameJs;
  private boolean earned;

  @Override public void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    if (!genuine()) {
      new AlertDialog.Builder(this).setTitle("Unofficial copy").setMessage("This copy of Splash Racer has been modified. Please install the official game from Google Play.")
        .setCancelable(false).setPositiveButton("OK", (d, w) -> finish()).show();
      return;
    }
    web = new WebView(this);
    web.setBackgroundColor(0xFF000000 | 0x1A6AB0);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setAllowFileAccess(false); s.setAllowContentAccess(false);
    s.setAllowFileAccessFromFileURLs(false); s.setAllowUniversalAccessFromFileURLs(false);
    // the game's files are served from https://appassets.androidplatform.net/assets/ (a secure, app-only address)
    final WebViewAssetLoader.AssetsPathHandler files = new WebViewAssetLoader.AssetsPathHandler(this);
    final WebViewAssetLoader assets = new WebViewAssetLoader.Builder().addPathHandler("/assets/", path -> {
      if ("game.js".equals(path) && K.key() != null) { byte[] g = game(); return g == null ? null : new WebResourceResponse("application/javascript", "utf-8", new ByteArrayInputStream(g)); }
      return files.handle(path);
    }).build();
    s.setMediaPlaybackRequiresUserGesture(false);
    web.setWebViewClient(new WebViewClient() {   // the game never navigates away from its own files
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return assets.shouldInterceptRequest(r.getUrl()); }
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !r.getUrl().toString().startsWith("https://appassets.androidplatform.net/"); }
    });
    web.setWebChromeClient(new WebChromeClient());
    WebView.setWebContentsDebuggingEnabled(false);
    web.addJavascriptInterface(new NativeBridge(), "GameNative");
    web.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    setContentView(web);
    hideSystemUi();
    MobileAds.initialize(this, st -> loadRewarded());
  }

  // ---------- protection ----------
  // the app only runs when it is signed with our certificate (or installed by Google Play, which re-signs apps
  // with its own app-signing key), is not debuggable, and no debugger is attached
  private boolean genuine() {
    if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0 || Debug.isDebuggerConnected() || Debug.waitingForDebugger()) return false;
    byte[][] ok = K.certs(); if (ok.length == 0) return true;   // a development build
    try {
      String inst = Build.VERSION.SDK_INT >= 30 ? getPackageManager().getInstallSourceInfo(getPackageName()).getInstallingPackageName() : getPackageManager().getInstallerPackageName(getPackageName());
      if ("com.android.vending".equals(inst)) return true;
      Signature[] sigs;
      if (Build.VERSION.SDK_INT >= 28) { PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES); sigs = pi.signingInfo.hasMultipleSigners() ? pi.signingInfo.getApkContentsSigners() : pi.signingInfo.getSigningCertificateHistory(); }
      else sigs = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES).signatures;
      MessageDigest sha = MessageDigest.getInstance("SHA-256");
      for (Signature sg : sigs) { byte[] h = sha.digest(sg.toByteArray()); for (byte[] o : ok) if (MessageDigest.isEqual(h, o)) return true; }
    } catch (Exception e) { return false; }
    return false;
  }
  // the game code, decrypted in memory (AES-256-GCM: a changed byte makes decryption fail)
  private synchronized byte[] game() {
    if (gameJs != null) return gameJs;
    try (InputStream in = getAssets().open("game.bin")) {
      ByteArrayOutputStream bo = new ByteArrayOutputStream(); byte[] buf = new byte[65536]; int n; while ((n = in.read(buf)) > 0) bo.write(buf, 0, n);
      byte[] all = bo.toByteArray(); Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
      c.init(Cipher.DECRYPT_MODE, new SecretKeySpec(K.key(), "AES"), new GCMParameterSpec(128, all, 0, 12));
      gameJs = c.doFinal(all, 12, all.length - 12);
    } catch (Exception e) { gameJs = null; }
    return gameJs;
  }
  // saved progress is signed with a key made for this phone on first run
  private SharedPreferences gp() { return getSharedPreferences("g", MODE_PRIVATE); }
  private String hmac(String d) {
    try {
      SharedPreferences p = gp(); String k = p.getString("k", null);
      if (k == null) { byte[] r = new byte[32]; new SecureRandom().nextBytes(r); k = Base64.encodeToString(r, Base64.NO_WRAP); p.edit().putString("k", k).apply(); }
      Mac m = Mac.getInstance("HmacSHA256"); m.init(new SecretKeySpec(Base64.decode(k, Base64.NO_WRAP), "HmacSHA256"));
      return Base64.encodeToString(m.doFinal(d.getBytes("UTF-8")), Base64.NO_WRAP);
    } catch (Exception e) { return ""; }
  }

  private void loadRewarded() {
    RewardedAd.load(this, REWARDED_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
      @Override public void onAdLoaded(@NonNull RewardedAd ad) { rewarded = ad; }
      @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { rewarded = null; web.postDelayed(() -> loadRewarded(), 30000); }
    });
  }
  private void tellGame(String tag, boolean ok) { web.evaluateJavascript("window.onAdDone&&window.onAdDone('" + tag + "'," + ok + ")", null); }

  private void hideSystemUi() {
    web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
      | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
      | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
  }

  @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus && web != null) hideSystemUi(); }
  @Override protected void onPause() { super.onPause(); if (web == null) return; web.evaluateJavascript("window.onAppPause&&window.onAppPause()", null); web.onPause(); }
  @Override protected void onResume() { super.onResume(); if (web == null) return; web.onResume(); web.evaluateJavascript("window.onAppResume&&window.onAppResume()", null); }

  @Override public void onBackPressed() {
    if (web == null) { finish(); return; }
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
    // saved progress: sign(key, data) after saving; check(key, data, sig) on loading → "ok", "new" (never signed) or "bad" (edited)
    @JavascriptInterface public String sign(String key, String data) { gp().edit().putBoolean("s_" + key, true).apply(); return hmac(data); }
    @JavascriptInterface public String check(String key, String data, String sig) {
      if (sig == null || sig.isEmpty()) return gp().getBoolean("s_" + key, false) ? "bad" : "new";
      return MessageDigest.isEqual(hmac(data).getBytes(), sig.getBytes()) ? "ok" : "bad";
    }
  }
}
