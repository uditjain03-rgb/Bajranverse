# Earning real money from Mad Taxi Masti (AdMob, step by step)

The game is already wired for **Google AdMob rewarded ads**. Right now it uses Google's public **test** IDs: they show
"Test Ad" and pay nothing. Follow these steps to switch to real ads and get paid.

## How ads work in this game

- There are **no ads during play** and no ads between rides.
- The only ads are **rewarded ads the player chooses** to watch:
  - **📺 TRY** in the garage: try a paint, wheels or an add-on free for one ride.
  - **📺 FREE 500 🪙** in the garage and the shop. It can be used once every 3 minutes.
  - **📺 WATCH AD: DOUBLE 🪙** on the results screen.
- Rewarded ads earn the most per view, and players do not mind them because they asked for them.

## Step 1: Create your AdMob account (one time)

1. Go to **admob.google.com** and sign in with the Google account you will use for Play Console.
2. Fill in your country, time zone and billing currency (for example INR).
3. Accept the AdMob terms.

## Step 2: Add the app to AdMob

1. In AdMob, open **Apps → Add app → Android**.
2. If the game is already on Google Play, search for it. Otherwise choose "not listed yet" and link it later.
3. Name it **Mad Taxi Masti**.
4. AdMob gives you an **App ID** like `ca-app-pub-1234567890123456~1234567890`.

## Step 3: Create one rewarded ad unit

1. In the app, open **Ad units → Add ad unit → Rewarded**.
2. Name it, for example `taxi_rewarded`.
3. Reward settings are not used by the game, because the game gives its own rewards. You can set 1 coin.
4. You get an **Ad unit ID** like `ca-app-pub-1234567890123456/9876543210`.

## Step 4: Put your IDs into the app

1. In `taxiapp/src/main/AndroidManifest.xml`, replace the value of
   `com.google.android.gms.ads.APPLICATION_ID` (`ca-app-pub-3940256099942544~3347511713`) with **your App ID**.
2. In `taxiapp/src/main/java/com/bajrangverse/madtaxi/MainActivity.java`, replace `REWARDED_ID`
   (`ca-app-pub-3940256099942544/5224354917`) with **your rewarded Ad unit ID**.
3. Increase `versionCode` in `taxiapp/build.gradle` (for example 3 → 4), then rebuild and sign (see the commands below).

**Important:** never tap your own real ads. To test on your own phone, add it as a **test device** first
(AdMob → Settings → Test devices). Invalid clicks can get the account banned.

## Step 5: Publish app-ads.txt (needed for full ad revenue)

1. You need a website, even a free one, such as GitHub Pages or Google Sites, e.g. `bajrangverse.com`.
2. In AdMob, open **Apps → View all apps → app-ads.txt**. Copy the line it shows, for example:
   `google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0`
3. Put that line in a file named `app-ads.txt` at the root of the website:
   `https://yourdomain.com/app-ads.txt`.
4. In Play Console, set **Store listing → Website** to the same domain. AdMob checks it within about 24 hours.

## Step 6: Google Play requirements

- **Data safety form** (Play Console → App content): say the app uses the **Advertising ID** and that the AdMob SDK
  collects device and ad data for advertising. AdMob's guide lists exactly what to tick.
- **Ads declaration**: answer "Yes, my app contains ads".
- **Target audience**: if you include children under 13, you must follow the Families policy. This means
  child-directed ad settings and only certified ad networks. The simplest choice is to set the target audience to 13+.
- **Privacy policy URL**: required. Host a short page that says the game stores progress only on the phone, and that
  Google AdMob shows rewarded ads and may use the advertising ID.
- **Consent (EU/UK users)**: in AdMob, open **Privacy & messaging → GDPR → Create message**. AdMob shows its consent
  form to users in Europe. India does not need it, but it is free and safe to turn on.

## Step 7: Get paid

1. In AdMob, open **Payments**. Add your name and address exactly as on your bank account, plus the **PAN**
   (tax info for India).
2. When your earnings reach the payment threshold (about ₹1,000 / $10), Google sends a **PIN letter by post** to
   verify your address. Enter it in AdMob.
3. Add your bank account (IFSC + account number). Google sends a small test deposit to confirm it.
4. You are paid monthly (around the 21st) once your balance is above the payout threshold (about ₹8,000 / $100).

## Selling cars and coin packs for real money (Google Play Billing, already built in)

In-game prices are in **🪙 coins**, which players earn by driving. Players can also buy cars and coin packs with real
money through Google Play. The app already contains this code. You only need to create the products:

1. In Play Console, open your app → **Monetize → Products → In-app products**. (Play asks you to upload an AAB with
   the billing library first. This version already has it.)
2. Create these **one-time products** with exactly these product IDs. Suggested prices are below; you can change them.

| Product ID | What the player gets | Suggested price |
|---|---|---|
| `car_auto` | Auto Rickshaw | ₹29 |
| `car_creta` | City Cruiser SUV | ₹49 |
| `car_tractor` | Kisan Tractor + Trolley | ₹49 |
| `car_thar` | Jungle King 4x4 | ₹79 |
| `car_muscle` | Muscle Masti V8 | ₹99 |
| `car_supercar` | Super Taxi GT | ₹129 |
| `car_monster` | Monster Bully 4x4 | ₹149 |
| `vip_allcars` | Every car, forever | ₹299 |
| `coins_25k` | 25,000 🪙 (can be bought again) | ₹49 |
| `coins_80k` | 80,000 🪙 | ₹129 |
| `coins_200k` | 200,000 🪙 | ₹249 |

3. Activate each product.
4. **Recommended:** copy your app's **licence key** (Play Console → Monetize → Monetization setup) into
   `PLAY_LICENSE_KEY` in `MainActivity.java`. The app then checks Google's signature on every purchase, so fake
   purchases from cracking tools are rejected.
5. Test before going live. In Play Console, open **Setup → License testing** and add your Gmail. Install the app from
   the internal testing track. Test purchases are free and are refunded automatically.

How it works in the game:

- When the store is available, the garage shows a gold **price button** (for example ₹79) next to the coin price.
- **🛒 SHOP** on the home screen and **🛒 GET COINS** in the garage sell the coin packs.
- Cars bought with money come back automatically after a reinstall, as long as the player uses the same Google account.
- Google keeps 15% and pays the rest into the same Payments profile as AdMob.
- When the game is not installed from Google Play, the money buttons simply don't appear.

## Rebuild and sign (after changing the IDs)

```
cd drive-src
CERTS=<upload certificate SHA-256> PROTECT=1 node build.mjs taxi        # obfuscates + encrypts the game code
cd ..
ANDROID_HOME=/opt/android-sdk /opt/gradle/bin/gradle :taxiapp:assembleRelease :taxiapp:bundleRelease
# then sign the .aab with your upload key and upload it to Play Console
```

To get the upload certificate SHA-256, run:

```
keytool -exportcert -alias upload -keystore play-upload-key/mad-taxi-upload.jks -storepass:file play-upload-key/mad-taxi-upload.pass | sha256sum
```

**Play App Signing:** Google re-signs apps installed from Play with its own key. The game accepts any copy that
Google Play installed. To also accept that key in other cases, copy the **App signing key certificate SHA-256** from
Play Console → **Setup → App signing** and pass it as `PLAY_CERT=<sha256>` when you build.

## About the car names

The 4x4 and the SUV are styled after popular Indian vehicles, but in the game they are called **Jungle King 4x4** and
**City Cruiser SUV**. Real brand names (Mahindra Thar, Hyundai Creta, and others) are trademarks. Using them in a game
you sell or show ads in needs the car makers' permission, and Google Play can remove apps that use brands without
permission.

## About copy protection (honest summary)

What the release build does:

- The game code is **obfuscated**: all names are scrambled. Strings are left in place, because moving them made the game about 6x slower to start.
- The game code is **encrypted** inside the APK (AES-256). It is only decrypted in memory and never written as a file.
- The app **refuses to run** if it was re-signed by someone else (a modded APK), is debuggable, or has a debugger attached.
- The Java side is shrunk and obfuscated by R8.
- Saved coins and progress are **signed**: editing them resets them.
- Copying the files onto a website does not work, because the game only runs inside the app.

No app that runs on a player's phone can be made 100% uncrackable: a determined expert with a rooted phone can
always dig in. These layers stop casual copying, APK "mod" sites and save editors, which is what matters in practice.
Keep the `play-upload-key/` folder private and backed up, because it is your identity on Google Play.
