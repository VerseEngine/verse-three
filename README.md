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
