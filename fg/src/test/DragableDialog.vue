<!-- 可拖拉Dialog 測試 -->
<template>
  <v-container class="fill-height d-flex justify-center align-center">
    <v-btn color="primary" dark @click="dialog = true">
      打開可拖曳的 Dialog
    </v-btn>

    <v-dialog v-model="dialog" max-width="500px" persistent scrollable :scrim="false" content-class="draggable-dialog-content" @update:modelValue="onDialogStateChange">
      <v-card ref="dialogCard" :style="dialogStyle" :class="{ 'is-positioned': isManuallyPositioned, 'is-dragging': dragging }">
        <v-card-title class="headline grey lighten-2 draggable-handle" @mousedown.prevent="startDrag">
          可拖曳的 Dialog
          <v-spacer></v-spacer>
          <v-btn icon @click="closeDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pt-4">
          這是一個可以透過拖曳標題列來移動的 Dialog。
          <br><br>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
          consequat.
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="closeDialog">
            確定
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      dialog: false,

      dragging: false,
      isManuallyPositioned: false,
      positionX: 0,
      positionY: 0,
      offsetX: 0,
      offsetY: 0,

      fixedWidth: null,
      fixedHeight: null,
    };
  },
  computed: {
    dialogStyle() {
      if (!this.isManuallyPositioned) {
        return {};
      }
      return {
        transform: `translate(${this.positionX}px, ${this.positionY}px)`,
        width: this.fixedWidth ? `${this.fixedWidth}px` : 'auto',
        height: this.fixedHeight ? `${this.fixedHeight}px` : 'auto',
      };
    },
  },

  methods: {
    // 只有當 Dialog 完全關閉後才重置狀態
    onDialogStateChange(isVisible) {
      if (!isVisible) {
        this.isManuallyPositioned = false;
        this.fixedWidth = null;
        this.fixedHeight = null;
      }
    },

    closeDialog() {
      this.dialog = false;
    },

    startDrag(e) {
      const dialogEl = this.$refs.dialogCard?.$el;
      if (!dialogEl) return;

      if (!this.isManuallyPositioned) {
        const rect = dialogEl.getBoundingClientRect();
        // this.positionX = rect.left;
        // this.positionY = rect.top;
        this.fixedWidth = rect.width;
        this.fixedHeight = rect.height;
        this.isManuallyPositioned = true;
      }

      this.dragging = true;
      this.offsetX = e.clientX - this.positionX;
      this.offsetY = e.clientY - this.positionY;

      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    },

    onDrag(e) {
      if (!this.dragging) return;
      this.positionX = e.clientX - this.offsetX;
      this.positionY = e.clientY - this.offsetY;
    },

    stopDrag() {
      if (this.dragging) {
        this.dragging = false;
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.stopDrag);
      }
    },
  },
  beforeDestroy() {
    this.stopDrag();
  }
};
</script>

<style lang="scss" scoped>
.is-positioned {
  // position: absolute !important;
  top: 0;
  left: 0;
  margin: 0 !important;
}

.draggable-handle {
  cursor: move;
}

.is-dragging {
  user-select: none;
}
</style>