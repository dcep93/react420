// https://console.firebase.google.com/u/0/project/react420/database/react420-default-rtdb/data

import { initializeApp } from "firebase/app"; // no compat for new SDK
import {
  Database,
  get,
  getDatabase,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import React from "react";

const project = "react420";

const config = {
  databaseURL: `https://${project}-default-rtdb.firebaseio.com/`,
};

var database: Database;
type ResultType = { val: () => BlobType | null };
type BlobType = any;

declare global {
  interface Window {
    firebaseinitialized: boolean;
  }
}
window.firebaseinitialized = false;
if (!window.firebaseinitialized) {
  window.firebaseinitialized = true;
  var app = initializeApp(config);
  database = getDatabase(app);
}

function _connect(path: string, callback: (value: BlobType) => void): void {
  onValue(ref(database, `${path}`), (snapshot: ResultType) => {
    var val = snapshot.val();
    console.log("firebase", Date.now() / 1000, window.location.href, val);
    callback(val);
  });
}

function _get(path: string): BlobType {
  return get(ref(database, `${path}`));
}

function _set(path: string, obj: BlobType): Promise<void> {
  return set(ref(database, `${path}`), obj);
}

function _push(path: string, obj: BlobType): Promise<string> {
  return push(ref(database, `${path}`), obj).then((pushed) => pushed.key!);
}

function _delete(path: string): Promise<void> {
  return remove(ref(database, `${path}`));
}

export class FirebaseWrapper<T, U = {}> extends React.Component<
  U,
  { state: T }
> {
  static firebaseWrapperComponent: FirebaseWrapper<any>;
  componentDidMount() {
    const oldComponent = FirebaseWrapper.firebaseWrapperComponent;
    FirebaseWrapper.firebaseWrapperComponent = this;
    if (oldComponent) {
      this.setState(oldComponent.state);
    } else {
      const title = this.getTitle();
      if (title !== null) document.title = title;
      _connect(this.getFirebasePath(), (state) =>
        FirebaseWrapper.firebaseWrapperComponent.setState.bind(
          FirebaseWrapper.firebaseWrapperComponent
        )({ state })
      );
    }
  }

  getTitle(): string | null {
    return null;
  }

  getFirebasePath(): string {
    return `/`;
  }

  render() {
    return <pre>{JSON.stringify(this.state, null, 2)}</pre>;
  }
}

const ex = {
  _connect,
  _get,
  _set,
  _push,
  _delete,
};

export default ex;
