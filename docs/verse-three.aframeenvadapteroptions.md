<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@verseengine/verse-three](./verse-three.md) &gt; [AFrameEnvAdapterOptions](./verse-three.aframeenvadapteroptions.md)

## AFrameEnvAdapterOptions interface

see: [AFrameEnvAdapter](./verse-three.aframeenvadapter.md)

**Signature:**

```typescript
export interface AFrameEnvAdapterOptions 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [getInteractableObjects?](./verse-three.aframeenvadapteroptions.getinteractableobjects.md) |  | () =&gt; THREE.Object3D\[\] \| undefined | _(Optional)_ Get a list of objects that can interact with a laser pointer (Other than teleport destination). |
|  [isLowSpecMode?](./verse-three.aframeenvadapteroptions.islowspecmode.md) |  | boolean | _(Optional)_ Some processing and textures for low resources. |
|  [onCursorHover?](./verse-three.aframeenvadapteroptions.oncursorhover.md) |  | (el: THREE.Object3D) =&gt; void | _(Optional)_ Cursor hover event handler. like [mouseover](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseover_event)<!-- -->. |
|  [onCursorLeave?](./verse-three.aframeenvadapteroptions.oncursorleave.md) |  | (el: THREE.Object3D) =&gt; void | _(Optional)_ Cursor leave event handler. like [mouseleave](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseleave_event)<!-- -->. |
|  [onSelectDown?](./verse-three.aframeenvadapteroptions.onselectdown.md) |  | (el: THREE.Object3D, point: THREE.Vector3) =&gt; void | _(Optional)_ Select button press event handler. like [mousedown](https://developer.mozilla.org/en-US/docs/Web/API/Element/mousedown_event)<!-- -->. |
|  [onSelectUp?](./verse-three.aframeenvadapteroptions.onselectup.md) |  | (el: THREE.Object3D, point: THREE.Vector3) =&gt; void | _(Optional)_ Select button release event handler. like [mouseup](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseup_event)<!-- -->. |
