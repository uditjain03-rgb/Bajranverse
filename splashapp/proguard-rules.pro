# the game talks to the app through this JavaScript bridge; keep its methods
-keepclassmembers class com.bajrangverse.splashracer.MainActivity$NativeBridge { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
# make the Java side harder to read: everything renamed into one flat package, logging removed
-repackageclasses ''
-allowaccessmodification
-assumenosideeffects class android.util.Log { *; }
