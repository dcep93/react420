import { initializeApp } from "firebase/app";
import { getDatabase, onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";

const config = {
  apiKey: "AIzaSyD0OE8rvJyvuKjCOXBrgBYVNcR_eMR51nM",
  authDomain: "make-wine.firebaseapp.com",
  databaseURL: "https://make-wine.firebaseio.com",
  projectId: "make-wine",
  storageBucket: "make-wine.appspot.com",
  messagingSenderId: "353430663930",
  appId: "1:353430663930:web:91e28b918740857aef0f43",
};
type ResultType = { val: () => BlobType | null };
type BlobType = any;
var initialized = false;
export default function FirebaseHacker() {
  function getDatabaseHelper() {
    return getDatabase(initializeApp(config));
  }
  const [state, updateState] = useState<BlobType>("loading...");
  const roomId = "Aw0QxSrR2";
  const userId = "X3hf2Lq3VvU1TZJfhYvuf9R4qRs1";
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      onValue(
        ref(getDatabaseHelper(), `/gameStates/${roomId}/players/${userId}`),
        (snapshot: ResultType) => {
          var val = snapshot.val();
          console.log(val);
          updateState(val);
        }
      );
    }
  }, []);
  console.log({ state });
  return (
    <pre
      onClick={() =>
        set(
          ref(getDatabaseHelper(), `/gameStates/${roomId}/players/${userId}`),
          state
        )
      }
    >
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}
