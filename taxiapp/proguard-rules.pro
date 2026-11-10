# the game talks to the app through this JavaScript bridge; keep its methods
-keepclassmembers class com.bajrangverse.madtaxi.MainActivity$NativeBridge { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
