# the game talks to the app through this JavaScript bridge; keep its methods
-keepclassmembers class com.bajrangverse.piratearmy.MainActivity$NativeBridge { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
