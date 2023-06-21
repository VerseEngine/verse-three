# verse-three
VerseEngine implementation for three.js.  
VerseEngine is a web-based metaverse engine on a P2P overlay network.


## Usage
[Link](docs/verse-three.start.md#example)


## Reference
[Link](docs/verse-three.md)


## About
This is a library to easily implement a web metaverse by combining the following libraries.

| | |
|---|---|
| [verse-core](https://github.com/VerseEngine/verse-core) | Web-based Metaverse Engine on P2P overlay network. |
| [three-move-controller](https://github.com/VerseEngine/three-move-controller) | Movement and rotation by keyboard and mouse. |
| [three-touch-controller](https://github.com/VerseEngine/three-touch-controller) | Joystick for touch operation. |
| [three-xr-controller](https://github.com/VerseEngine/three-xr-controller) | VR controller. |
| [three-avatar](https://github.com/VerseEngine/three-avatar) | Avatar system for three.js. |
| [verse-three-ui](https://github.com/VerseEngine/verse-three-ui) | Minimum GUI for Metaverse. |

![three-verse0](https://user-images.githubusercontent.com/125547575/226802229-19d2d212-40ed-45a7-9803-34f2d430d1ee.jpg)
![three-verse1](https://user-images.githubusercontent.com/125547575/226802240-3979f2ec-dcd6-4a28-aab0-d93b62a3ce67.jpg)

## Example
### HTTP
```bash
npm run example
```
http://localhost:8080/demo/

### HTTPS

```
brew install mkcert
mkcert -install
mkdir cert
cd cert
mkcert localhost 127.0.0.1 192.168.10.2
cd ..
npm run example-ssl
```

https://localhost:8080/demo/


## Installation
### npm
```bash
npm install @verseengine/verse-three
```

### CDN (ES Mobules)
```html
<script
      async
      src="https://cdn.jsdelivr.net/npm/es-module-shims@1.6.2/dist/es-module-shims.min.js"
    ></script>
<script type="importmap">
  {
    "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.150.0/build/three.module.js",
        "three/examples/jsm/": "https://cdn.jsdelivr.net/npm/three@0.150.0/examples/jsm/",
        "@pixiv/three-vrm": "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@1.0.9/lib/three-vrm.module.min.js",
        "verse-three": "https://cdn.jsdelivr.net/npm/@verseengine/verse-three@1.0.0/dist/esm/index.min.js"
    }
  }
</script>
<script>
const VERSE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@verseengine/verse-three@1.0.0/dist/verse_core_bg.wasm";
...
</script>
```