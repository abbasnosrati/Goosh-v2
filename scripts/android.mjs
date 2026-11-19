import {
  readFileSync,
  writeFileSync
} from 'node:fs'
const file = 'android/app/src/main/AndroidManifest.xml'
const text = readFileSync(file, 'utf8')
if (!text.includes('android.permission.RECORD_AUDIO')) writeFileSync(file, text.replace('</manifest>', '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n</manifest>'))

const javaDir = 'android/app/src/main/java/net/goosh/studio/'
writeFileSync(javaDir + 'EtudeFiles.java', readFileSync('native/android/EtudeFiles.java'))
const main = javaDir + 'MainActivity.java'
writeFileSync(main, `package net.goosh.studio;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle state) {
        registerPlugin(EtudeFiles.class);
        super.onCreate(state);
    }
}
`)
