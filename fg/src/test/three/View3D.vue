<template>
  <v-card style="margin: 20px;">
    <v-card-title>
      <h2>Three.js 模型</h2>
    </v-card-title>
    <div class="viewer-container">
      <!-- 3D畫布 -->
      <div ref="canvasContainer" class="canvas-container"></div>
    </div>
  </v-card>
  <!-- 右鍵選單 -->
  <div id="context-menu" ref="contextMenu">
    <ul>
      <li data-action="view-top">頂視圖 (Top)</li>
      <li data-action="view-front">前視圖 (Front)</li>
      <li data-action="view-side">側視圖 (Side)</li>
      <hr>
      <li data-action="opacity-1">不透明 (Opaque)</li>
      <li data-action="opacity-0.5">半透明 (Translucent)</li>
      <hr>
      <li data-action="reset-selection">清除所有閃爍</li>
      <li data-action="toggle-wireframe">切換線框模式</li>
      <li data-action="toggle-edges">切換邊框可見性</li>
      <li data-action="toggle-axes">顯示/隱藏座標軸</li>
    </ul>
  </div>

  <v-dialog v-model="info['dialog']" width="1000">
    <v-card style="width: 100%;">
      <v-card-title>
        <span style="display: block; word-break: break-word; white-space: normal; max-width: 100%;">
          點選閃爍位置: {{ info['item']['faceIndex'] }}
        </span>
      </v-card-title>
    </v-card>
  </v-dialog>

  <loadingAnimation :loading="setLoading" />
</template>

<script>
import loadingAnimation from '@/components/loadingAnimation.vue'

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export default {
  components: { loadingAnimation },
  data() {
    return {
      setLoading: false,  // 載入模型動畫
      // --- 區分單擊和雙擊的狀態 ---
      clickTimer: null,   // 儲存 setTimeout 的 ID
      clickCount: 0,      // 記錄點擊次數
      clickDelay: 250,    // 雙擊的延遲時間 (毫秒)
      // --- 模型資訊 ---
      color: { bg: "#CACACE", module: "#D3D3D3", border: "#000000" },
      objFile: 'my_model.obj',
      materialFile: 'SC Texture .bmp',
      highlightedFaces: [],
      // --- 模型閃爍位置Dialog ---
      info: { dialog: false, item: {} }
    };
  },
  watch: {},
  mounted() {
    this.init();
  },
  beforeUnmount() {
    cancelAnimationFrame(this.animationId);
    this.removeEventListeners();
    if (this.scene) {
      this.scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
          else object.material.dispose();
        }
      });
    }
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  },
  methods: {
    // ============================================= 初始化所有3D場景內容 (場景、相機、渲染器、燈光、控制器和全域變數) =============================================
    init() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(this.color['bg']);

      const container = this.$refs.canvasContainer;
      this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 2000);
      this.camera.position.set(10, 10, 10);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(this.renderer.domElement);

      // --- 燈光 (預設白光) ---
      const ambientLight = new THREE.AmbientLight("#ffffff", 1.0);
      this.scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight("#ffffff", 1.5);
      directionalLight.position.set(1, 1, 1).normalize();
      this.scene.add(directionalLight);

      // --- 控制器 ---
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,    // 左鍵拖曳 -> 旋轉
        MIDDLE: THREE.MOUSE.PAN,     // 中鍵拖曳 -> 平移
      };

      // --- 全域變數初始化 ---
      this.targetModel = null;
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.clock = new THREE.Clock();
      this.modelBaseColor = new THREE.Color(this.color['module']);
      this.highlightColor = new THREE.Color('#ff0000');
      this.normalToFacesMap = new Map(); // 用於存儲共面分組

      // --- 開始載入模型 ---
      this.setLoading = true;
      this.animate();             // 啟動動畫
      this.addModuleEvent();      // 綁定事件監聽器
      this.loadObjModel(`/module/${this.objFile}`)      // 載入模型 (obj檔案)
      this.setLoading = false;
    },
    // ============================================= 載入模型/紋理資訊 =============================================
    // 載入 OBJ 模型
    loadObjModel(objPath) {
      const loader = new OBJLoader();
      loader.load(objPath, (o) => {
        this.handleLoadedMaterial(o); 
      });
    },
    // 更新模型材質
    updateModelTexture(texture) {
      if (!this.targetModel) return;
      const material = this.targetModel.material;
      if (material) {
        material.map = texture; // 如果材質已經存在，更新 map 屬性
        material.color.set("#ffffff"); // 避免紋理的顏色被材質的基色影響。
        material.needsUpdate = true;
      } else {
        // 如果目標模型沒有材質，則創建一個新的
        const newMaterial = new THREE.MeshStandardMaterial({ map: texture, vertexColors: true });
        this.targetModel.material = newMaterial;
      }

      // 如果模型是從 OBJ 或 FBX 載入的，它可能是一個 Group
      // 裡面的多個 Mesh 共用或擁有各自的材質，因此遍歷整個模型 Group
      const modelGroup = this.scene.getObjectByName("current_model_group");
      if (modelGroup) {
        modelGroup.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) { // 多個材質
              child.material.forEach(m => {
                m.map = texture;
                m.color.set(0xffffff);
                m.needsUpdate = true;
              });
            } else { // 單一材質
              child.material.map = texture;
              child.material.color.set(0xffffff);
              child.material.needsUpdate = true;
            }
          }
        });
      }
    },
    // ============================================= 模型基礎設定 =============================================
    // 設定模型材質
    handleLoadedMaterial(object) {
      let mainMesh = null;
      let maxVertices = 0;

      object.traverse((child) => {
        if (child.isMesh) {
          const childGeometry = child.geometry;
          // 如果 MTL 檔案有定義顏色，child.material.color 就會有值
          const baseColor = child.material.color || new THREE.Color(this.color.module);
          const vertexCount = childGeometry.attributes.position.count;
          const colors = [];
          for (let i = 0; i < vertexCount; i++) colors.push(baseColor.r, baseColor.g, baseColor.b);
          childGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          childGeometry.setAttribute('originalColor', childGeometry.attributes.color.clone());

          // 確保材質啟用頂點顏色
          if (Array.isArray(child.material)) child.material.forEach(m => { m.vertexColors = true; m.needsUpdate = true; });
          else if (child.material) {
            child.material.vertexColors = true;
            child.material.needsUpdate = true;
          }
          if (childGeometry.attributes.position.count > maxVertices) {
            maxVertices = childGeometry.attributes.position.count;
            mainMesh = child;
          }
        }
      });
      if (!mainMesh) return; // 檔案中未找到任何有效的 Mesh 物件
      this.targetModel = mainMesh;
      const mainMeshGeometry = mainMesh.geometry;
      this.setModuleInfo(mainMeshGeometry)
    },
    // 設定匯入模型的資訊
    async setModuleInfo(g) {
      if (g.hasAttribute('color')) console.log("偵測到模型自帶顏色，將使用原始顏色。");
      else {
        const vertexCount = g.attributes.position.count;
        const colors = [];
        for (let i = 0; i < vertexCount; i++) colors.push(this.modelBaseColor.r, this.modelBaseColor.g, this.modelBaseColor.b);
        g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        g.setAttribute('originalColor', g.attributes.color.clone());
      }
      // 本地直接讀取材質
      let material;
      try {
        // 建立紋理載入器並等待紋理載入
        const textureLoader = new THREE.TextureLoader();
        const texture = await textureLoader.loadAsync(`/material/${this.materialFile}`);
        texture.flipY = true;
        // 建立使用紋理的材質
        material = new THREE.MeshStandardMaterial({ map: texture, vertexColors: true });
      } catch (error) {
        // 如果紋理載入失敗，則進入 catch 區塊
        console.error('紋理載入失敗，將使用預設材質:', error);
        // 建立一個不含紋理的備用材質
        material = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 100 });
      }
      const mesh = new THREE.Mesh(g, material);
      const edges = new THREE.EdgesGeometry(g, 15);
      const lineMaterial = new THREE.LineBasicMaterial({ color: this.color['border'], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      const edgesMesh = new THREE.LineSegments(edges, lineMaterial);

      // 輔助線設置
      this.axesHelper = new THREE.AxesHelper(150);
      this.axesHelper.position.set(0, 0, 0);
      this.axesHelper.visible = true;

      const modelGroup = new THREE.Group();
      modelGroup.add(mesh);
      modelGroup.add(edgesMesh);
      modelGroup.add(this.axesHelper);
      modelGroup.name = "current_model_group";

      g.computeBoundingBox();
      const center = new THREE.Vector3();
      g.boundingBox.getCenter(center);
      modelGroup.position.sub(center);
      this.scene.add(modelGroup);
      this.targetModel = mesh;
      this.edgesModel = edgesMesh;

      // 模型載入後，執行共面分組預處理
      this.buildCoplanarGroups();
      // 定義相機位置
      this.frameArea(modelGroup);
    },

    /**
     * 將相機縮放到能完整顯示指定物件的區域。
     * @param {THREE.Object3D} objectToFit - 需要被完整顯示的模型或群組。
     * @param {number} [offset=1] - 偏移係數，數值越大，模型在畫面中看起來越小（距離越遠）。
     */
    frameArea(objectToFit, offset = 1) {
      if (!objectToFit) return; // 無法聚焦於空物件

      // 1. 計算物件的邊界框
      const box = new THREE.Box3().setFromObject(objectToFit, true);
      if (box.isEmpty()) return; // 物件的邊界框為空 (模型載入失敗)

      // 2. 獲取尺寸
      const size = box.getSize(new THREE.Vector3());
      // 物件已置中，其中心點為 (0,0,0)
      const center = new THREE.Vector3(0, 0, 0);

      // 3. 計算最大維度
      const maxSize = Math.max(size.x, size.y, size.z);

      // 4. 計算 FOV
      const fov = this.camera.fov * (Math.PI / 180);

      // 5. 計算理想距離
      let cameraZ = Math.abs(maxSize / 2 / Math.tan(fov / 2));
      cameraZ *= offset;

      // 6. 設定相機位置
      const direction = new THREE.Vector3(1, 1, 1).normalize();
      this.camera.position.copy(direction.multiplyScalar(cameraZ));

      // 7. 控制器的目標為原點
      this.controls.target.copy(center);
      this.controls.update();

      // 8. 更新遠近裁剪平面
      this.camera.near = cameraZ / 100;
      this.camera.far = cameraZ * 100;
      this.camera.updateProjectionMatrix();
    },

    // 預處理函式，根據面的法線向量和空間位置將所有面進行分組，用於平面選取
    buildCoplanarGroups() {
      if (!this.targetModel) return;
      const geometry = this.targetModel.geometry;
      // 模型幾何體缺少法線或位置數據，無法進行分組
      if (!geometry.attributes.normal || !geometry.attributes.position) return;
      this.normalToFacesMap.clear();
      const normals = geometry.attributes.normal;
      const positions = geometry.attributes.position;
      const faceCount = positions.count / 3;

      // 創建一個臨時向量來輔助計算，避免在迴圈中重複創建
      const tempNormal = new THREE.Vector3();
      const tempPosition = new THREE.Vector3();

      for (let i = 0; i < faceCount; i++) {
        // 獲取代表這個面的法線向量和一個點
        tempNormal.fromBufferAttribute(normals, i * 3);
        tempPosition.fromBufferAttribute(positions, i * 3);

        // 計算平面的偏移量 D = - (P · N)，其中 P 是點，N 是法線
        const d = -tempPosition.dot(tempNormal);

        // 為了處理浮點數精度問題，對所有數值進行四捨五入
        const precision = 2; // 精度設為小數點後2位，可以根據模型調整
        const nx = tempNormal.x.toFixed(precision);
        const ny = tempNormal.y.toFixed(precision);
        const nz = tempNormal.z.toFixed(precision);
        const d_rounded = d.toFixed(precision);

        // 創建包含方向和位置資訊的唯一 key
        const key = `normal(${nx},${ny},${nz})_offset(${d_rounded})`;

        if (!this.normalToFacesMap.has(key)) this.normalToFacesMap.set(key, []);
        this.normalToFacesMap.get(key).push(i);
      }
      console.log("共面(位置+方向)分組完成，總共有", this.normalToFacesMap.size, "個獨立平面。");
    },
    // ============================================= 設定事件監聽器管理 =============================================
    addModuleEvent() {
      // 模型事件
      this.renderer.domElement.addEventListener('click', this.handlePointerDown);
      this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
      this.$refs.contextMenu.addEventListener('click', this.onMenuClick);
      // 整體事件
      window.addEventListener('click', this.onWindowClick);
      window.addEventListener('resize', this.onWindowResize);
    },
    removeEventListeners() {
      this.renderer.domElement.removeEventListener('click', this.handlePointerDown);
      this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);
      if (this.$refs.contextMenu) {
        this.$refs.contextMenu.removeEventListener('click', this.onMenuClick);
      }
      window.removeEventListener('click', this.onWindowClick);
      window.removeEventListener('resize', this.onWindowResize);
    },
    // 處理單次、雙次點擊功能區分
    handlePointerDown(event) {
      if (event.button !== 0) return; // 只處理左鍵點擊
      this.clickCount++; // 點擊次數加一
      if (this.clickCount === 1) {
        // 如果是第一次點擊，啟動計時器
        this.clickTimer = setTimeout(() => {
          // 計時器結束後，如果點擊次數仍然是 1，則執行單擊邏輯
          if (this.clickCount === 1) this.clickModule(event);
          this.clickCount = 0;
        }, this.clickDelay);
      } else if (this.clickCount === 2) {
        // 如果是第二次點擊 (在延遲時間內)
        clearTimeout(this.clickTimer);
        this.onMouseDoubleClick(event);
        this.clickCount = 0;
      }
    },
    // 單擊開啟閃爍位置視窗
    clickModule(event) {
      if (!this.targetModel) return;
      const intersects = this.getClickPosition(event);
      if (intersects.length > 0) {
        const clickedFaceIndex = intersects[0].faceIndex;
        const foundGroup = this.highlightedFaces.find(group => group.faceIndex.includes(clickedFaceIndex));
        if (foundGroup) {
          this.info['dialog'] = true;
          this.info['item'] = foundGroup;
        } else {
          this.info['dialog'] = false;
          this.info['item'] = {};
        }
      }
    },
    // 雙擊平面位置控制閃爍
    onMouseDoubleClick(event) {
      if (!this.targetModel) return;

      const intersects = this.getClickPosition(event);
      if (intersects.length > 0) {
        const clickedFaceIndex = intersects[0].faceIndex;
        const geometry = this.targetModel.geometry;
        const normals = geometry.attributes.normal;
        const positions = geometry.attributes.position;

        const tempNormal = new THREE.Vector3().fromBufferAttribute(normals, clickedFaceIndex * 3);
        const tempPosition = new THREE.Vector3().fromBufferAttribute(positions, clickedFaceIndex * 3);

        const d = -tempPosition.dot(tempNormal);
        const precision = 2;
        const nx = tempNormal.x.toFixed(precision);
        const ny = tempNormal.y.toFixed(precision);
        const nz = tempNormal.z.toFixed(precision);
        const d_rounded = d.toFixed(precision);

        const key = `normal(${nx},${ny},${nz})_offset(${d_rounded})`;
        const faceGroup = this.normalToFacesMap.get(key);
        if (!faceGroup || faceGroup.length === 0) {
          console.log(`點擊了面 ${clickedFaceIndex}，但未找到對應的平面群組。Key: ${key}`);
          return;
        }

        // --- 用於驗證和比對的臨時高亮邏輯 ---
        console.log(`--- 點擊資訊 ---`);
        console.log(`點擊的面索引: ${clickedFaceIndex}`);
        console.log(`生成的查詢 Key: "${key}"`);
        console.log(`找到的共面群組:`, faceGroup);
        console.log(`----------------------------------`);

        const platformGroup = this.findConnectedPlatform(clickedFaceIndex, faceGroup);
        if (platformGroup.length === 0) return;

        const representativeFaceIndex = platformGroup[0];
        const existingGroupIndex = this.highlightedFaces.findIndex(group => group.faceIndex.includes(representativeFaceIndex));

        if (existingGroupIndex !== -1) {
          // 如果已高亮，則恢復顏色並從中移除整個群組物件
          const groupToRemove = this.highlightedFaces[existingGroupIndex];
          groupToRemove.faceIndex.forEach(faceIndex => this.restoreFaceColor(faceIndex));
          this.highlightedFaces.splice(existingGroupIndex, 1);
        } else {
          // 如果未高亮，則將整個平台作為一個新物件添加進去
          this.highlightedFaces.push({
            id: crypto.randomUUID(),
            faceIndex: platformGroup,
            flash: true
          });
        }
      }
    },
    // 使用 BFS 在一個大的共面群組中，動態查找與起點相連的子集（平台）
    findConnectedPlatform(startFaceIndex, coplanarGroupArray) {
      if (!this.targetModel) return [];
      const geometry = this.targetModel.geometry;
      const positions = geometry.attributes.position;
      const coplanarGroupSet = new Set(coplanarGroupArray);

      // 步驟 1: 為這個共面群組動態構建一個局部的鄰接關係
      const localAdjacency = new Map();
      const edgeMap = new Map();

      // 只抓取這個共面群組內部的邊
      for (const faceIndex of coplanarGroupArray) {
        localAdjacency.set(faceIndex, []);
        const faceVertices = this.getFaceVertices(geometry, faceIndex);
        const vertices = [faceVertices.a, faceVertices.b, faceVertices.c];

        for (let j = 0; j < 3; j++) {
          const v1Index = vertices[j];
          const v2Index = vertices[(j + 1) % 3];

          // 基於頂點的實際 XYZ 座標
          const p1 = new THREE.Vector3().fromBufferAttribute(positions, v1Index);
          const p2 = new THREE.Vector3().fromBufferAttribute(positions, v2Index);
          // 將座標四捨五入到一定精度來創建唯一的邊 key
          const precision = 1e-4;
          const key1 = `${Math.round(p1.x / precision)}_${Math.round(p1.y / precision)}_${Math.round(p1.z / precision)}`;
          const key2 = `${Math.round(p2.x / precision)}_${Math.round(p2.y / precision)}_${Math.round(p2.z / precision)}`;
          const edgeKey = key1 < key2 ? `${key1}-${key2}` : `${key2}-${key1}`;

          if (edgeMap.has(edgeKey)) {
            const otherFaceIndex = edgeMap.get(edgeKey);
            localAdjacency.get(faceIndex).push(otherFaceIndex);
            localAdjacency.get(otherFaceIndex).push(faceIndex);
          } else {
            edgeMap.set(edgeKey, faceIndex);
          }
        }
      }
      // 步驟 2: 使用這個局部的鄰接關係執行 BFS
      const platform = [];
      const queue = [startFaceIndex];
      const visited = new Set([startFaceIndex]);
      while (queue.length > 0) {
        const currentFaceIndex = queue.shift();
        platform.push(currentFaceIndex);
        const neighbors = localAdjacency.get(currentFaceIndex);
        if (!neighbors) continue;
        for (const neighborIndex of neighbors) {
          if (!visited.has(neighborIndex) && coplanarGroupSet.has(neighborIndex)) {
            visited.add(neighborIndex);
            queue.push(neighborIndex);
          }
        }
      }
      return platform;
    },
    // 右鍵開啟Menu
    onContextMenu(event) {
      event.preventDefault();
      // 步驟 1: 獲取 canvas 容器的 DOM 元素及其邊界框
      const container = this.$refs.canvasContainer;
      const rect = container.getBoundingClientRect();
      // 步驟 2: 計算滑鼠在 canvas 元素內的相對座標
      const mouseXInCanvas = event.clientX - rect.left;
      const mouseYInCanvas = event.clientY - rect.top;
      const menu = this.$refs.contextMenu;
      menu.style.top = `${mouseYInCanvas}px`;
      menu.style.left = `${mouseXInCanvas}px`;
      menu.style.display = 'block';
    },
    // 點擊外部範圍關閉Menu
    onWindowClick(event) {
      const menu = this.$refs.contextMenu;
      if (menu && !menu.contains(event.target)) menu.style.display = 'none';
    },
    // 點選Menu內資訊
    onMenuClick(event) {
      const action = event.target.dataset.action;
      if (!action) return;
      if (!this.targetModel && (action.startsWith('opacity') || action === 'reset-selection')) {
        alert("模型尚未載入完成！");
        return;
      }
      let viewDistance = 150;
      if (this.targetModel) {
        const box = new THREE.Box3().setFromObject(this.targetModel);
        const size = box.getSize(new THREE.Vector3());
        const modelSize = Math.max(size.x, size.y, size.z);
        viewDistance = modelSize > 0 ? modelSize * 1.5 : 150;
      }
      switch (action) {
        case 'view-top': this.camera.position.set(0, viewDistance, 0.01); break;
        case 'view-front': this.camera.position.set(0, 0, viewDistance); break;
        case 'view-side': this.camera.position.set(viewDistance, 0, 0); break;
        case 'opacity-1':
          this.targetModel.material.transparent = false;
          this.targetModel.material.opacity = 1.0;
          this.targetModel.material.needsUpdate = true;
          break;
        case 'opacity-0.5':
          this.targetModel.material.transparent = true;
          this.targetModel.material.opacity = 0.5;
          this.targetModel.material.needsUpdate = true;
          break;
        case 'reset-selection': // 清除所有閃爍
          this.highlightedFaces.forEach(group => {
            group.faceIndex.forEach(faceIndex => this.restoreFaceColor(faceIndex));
          });
          this.highlightedFaces = [];
          break;
        case 'toggle-wireframe': // 切換線框模式
          this.targetModel.material.wireframe = !this.targetModel.material.wireframe;
          break;
        case 'toggle-edges': // 切換邊框可見性
          if (this.edgesModel) this.edgesModel.visible = !this.edgesModel.visible;
          break;
        case 'toggle-axes': // 顯示/隱藏座標軸
          this.axesHelper.visible = !this.axesHelper.visible;
          break;
      }
      if (action.startsWith('view')) this.controls.target.set(0, 0, 0);
      this.$refs.contextMenu.style.display = 'none';
    },
    // Resize 3D模組
    onWindowResize() {
      const container = this.$refs.canvasContainer;
      if (!container) return;
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    },

    // ============================================= 補全的幫助函式 =============================================
    // 取得滑鼠點擊座標設定
    getClickPosition(event) {
      // 步驟 1: 獲取 canvas 容器的 DOM 元素及其邊界框
      const container = this.$refs.canvasContainer;
      const rect = container.getBoundingClientRect();
      // 步驟 2: 計算滑鼠在 canvas 元素內的相對座標
      const mouseXInCanvas = event.clientX - rect.left;
      const mouseYInCanvas = event.clientY - rect.top;
      // 步驟 3: 使用相對座標來計算標準化設備座標 (-1 to +1)
      this.mouse.x = (mouseXInCanvas / container.clientWidth) * 2 - 1;
      this.mouse.y = - (mouseYInCanvas / container.clientHeight) * 2 + 1;
      // 光線投射邏輯
      this.raycaster.setFromCamera(this.mouse, this.camera);
      return this.raycaster.intersectObject(this.targetModel);
    },

    /**
     * 將指定索引的面的顏色恢復為原始顏色。
     * @param {number} faceIndex - 要恢復的面的索引
     */
    restoreFaceColor(faceIndex) {
      if (!this.targetModel) return;
      const geometry = this.targetModel.geometry;
      const colorAttribute = geometry.attributes.color;
      const originalColorAttribute = geometry.attributes.originalColor;
      const face = this.getFaceVertices(geometry, faceIndex);

      if (!face || !originalColorAttribute) return;

      // 從備份的 'originalColor' 屬性中讀取顏色並恢復
      colorAttribute.setXYZ(face.a, originalColorAttribute.getX(face.a), originalColorAttribute.getY(face.a), originalColorAttribute.getZ(face.a));
      colorAttribute.setXYZ(face.b, originalColorAttribute.getX(face.b), originalColorAttribute.getY(face.b), originalColorAttribute.getZ(face.b));
      colorAttribute.setXYZ(face.c, originalColorAttribute.getX(face.c), originalColorAttribute.getY(face.c), originalColorAttribute.getZ(face.c));

      // 標記更新，確保恢復操作能立即顯示
      colorAttribute.needsUpdate = true;
    },

    /**
     * 根據面的索引，獲取構成該面的三個頂點的索引。
     * @param {THREE.BufferGeometry} g - 模型的幾何體
     * @param {number} idx - 面的索引
     * @returns {{a: number, b: number, c: number}} - 包含三個頂點索引的對象
     */
    getFaceVertices(g, idx) {
      if (g.index) {
        // 對於索引幾何體 (indexed geometry)
        return { a: g.index.getX(idx * 3), b: g.index.getX(idx * 3 + 1), c: g.index.getX(idx * 3 + 2) };
      } else {
        // 對於非索引幾何體 (non-indexed geometry)
        return { a: idx * 3, b: idx * 3 + 1, c: idx * 3 + 2 };
      }
    },

    // 動畫迴圈
    animate() {
      this.animationId = requestAnimationFrame(this.animate);
      this.controls.update();
      if (this.targetModel && this.highlightedFaces.length > 0) {
        const blinkAlpha = (Math.sin(this.clock.getElapsedTime() * 6) + 1) / 2;
        const tempColor = new THREE.Color();
        const geometry = this.targetModel.geometry;
        const colorAttribute = geometry.attributes.color;
        tempColor.copy(this.modelBaseColor).lerp(this.highlightColor, blinkAlpha);
        for (const highlightedGroup of this.highlightedFaces) {
          if (highlightedGroup.flash) {
            // 內層迴圈遍歷該平台的所有面索引
            for (const faceIndex of highlightedGroup.faceIndex) {
              const face = this.getFaceVertices(geometry, faceIndex);
              colorAttribute.setXYZ(face.a, tempColor.r, tempColor.g, tempColor.b);
              colorAttribute.setXYZ(face.b, tempColor.r, tempColor.g, tempColor.b);
              colorAttribute.setXYZ(face.c, tempColor.r, tempColor.g, tempColor.b);
            }
          }
        }
        colorAttribute.needsUpdate = true;
      }
      this.renderer.render(this.scene, this.camera);
    },
  }
};
</script>

<style lang="scss" scoped>
.viewer-container {
  width: 100%;
  height: 90vh;
  position: relative;
  overflow: hidden;
}

.canvas-container {
  width: 100%;
  height: 100%;
}

#context-menu {
  display: none;
  position: absolute;
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 160px;
  border-radius: 5px;
  overflow: hidden;
  font-family: sans-serif;
  user-select: none;

  ul {
    list-style: none;
    margin: 0;
    padding: 5px 0;
  }

  li {
    padding: 8px 15px;
    cursor: pointer;
    font-size: 14px;
    color: black;
  }

  li:hover {
    background-color: #007bff;
    color: white;
  }

  hr {
    border: 0;
    border-top: 1px solid #e0e0e0;
    margin: 5px 0;
  }
}
</style>