<template>
  <div @mousemove="onDrag" @mouseup="endDrag">
    <svg :width=item.width :height="item.height">
      <polyline :points="arrowPoints" fill="none" :stroke="item.polylineColor" stroke-width="3" marker-end="url(#arrowhead)"/>
      <!-- 箭頭標記 -->
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="17" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" :fill="item.polylineColor" />
        </marker>
      </defs>

      <!-- 拖拉端點 -->
      <circle :cx="item.start.x" :cy="item.start.y" r="6" :fill="item.start.color" style="cursor: pointer;" @mousedown.stop="startPointDrag(0, $event)" />
      <circle :cx="item.end.x" :cy="item.end.y" r="6" :fill="item.end.color" style="cursor: pointer;" @mousedown.stop="startPointDrag(1, $event)" />
    </svg>
  </div>
</template>
<script>
export default {
  props: ["componentChange", "item"],
  computed: {
    arrowPoints() {
      const { x: x1, y: y1 } = this.item.start;
      const { x: x2, y: y2 } = this.item.end;
      const midX = x1 + (x2 - x1) / 2;
      return `${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`;
    },
    box() {
      const minX = Math.min(this.item.start.x, this.item.end.x);
      const minY = Math.min(this.item.start.y, this.item.end.y);
      const width = Math.abs(this.item.start.x - this.item.end.x);
      const height = Math.abs(this.item.start.y - this.item.end.y);
      return { x: minX, y: minY, width, height };
    },
  },
  methods: {
    startPointDrag(index) {
      this.item.draggingPoint = index;
    },
    onDrag(event) {
      const svg = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - svg.left;
      const y = event.clientY - svg.top;
      const scolor = this.item.start.color;
      const ecolor = this.item.end.color;
      // 拖端點
      if (this.item.draggingPoint !== null) {
        switch (this.item.draggingPoint) {
          case 0:
            this.item.start = { x, y, color: scolor };
            break;
          case 1:
            this.item.end = { x, y, color: ecolor };
            break;
        }
      }
    },
    endDrag() {
      this.item.draggingPoint = null;
      delete this.item.draggingPoint;
    },
  },
}
</script>
