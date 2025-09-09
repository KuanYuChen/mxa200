import * as d3 from 'd3';

// Vue資訊
var that = null;

var linesGroup = null;
var lineGenerator = null; // D3 線條生成器
var xAxisGroup = null;    // D3 X軸 <g> 元素的引用
var yAxisGroup = null;    // D3 Y軸 <g> 元素的引用


var initVueInfo = function (info) {
  that = info
}

var removeSVG = function() {
  d3.select(that.$refs.chartContainerWrapper).select('svg').remove();
  that.svg = null;
}

var createChart = function () {
  if (that.currentWidth <= 0 || that.currentHeight <= 0 || !that.$refs.chartContainerWrapper || that.innerWidth <= 0 || that.innerHeight <= 0) {
    return;
  }
  removeSVG();
  // 獲取最外層的 svg 元素，以便添加 <defs>
  const svgRoot = d3.select(that.$refs.chartContainerWrapper).append('svg').attr('width', that.currentWidth).attr('height', that.currentHeight);

  // -- 新增: 定義 clipPath --
  svgRoot.append('defs').append('clipPath')
    .attr('id', 'clip-rect') // 給 clipPath一個ID
    .append('rect')
    .attr('width', that.innerWidth) // 裁剪區域寬度等於內部繪圖寬度
    .attr('height', that.innerHeight); // 裁剪區域高度等於內部繪圖高度

  // 主要的 <g> 元素，應用 transform (邊距)
  that.svg = svgRoot.append('g').attr('transform', `translate(${that.chartMargin.left},${that.chartMargin.top})`);

  // zoom參數設定
  that.originalXScale = d3.scaleTime().range([0, that.innerWidth]);
  that.originalYScale = d3.scaleLinear().range([that.innerHeight, 0]);
  that.xScale = that.originalXScale.copy();
  that.yScale = that.originalYScale.copy();


  lineGenerator = d3.line()
    .x(d => that.xScale(d.time))
    .y(d => that.yScale(d.value))
    .curve(d3.curveMonotoneX);

  // 格線組
  that.yAxisGridGroup = that.svg.append('g').attr('class', 'grid y-grid');
  that.xAxisGridGroup = that.svg.append('g').attr('class', 'grid x-grid').attr('transform', `translate(0,${that.innerHeight})`);

  // 坐標軸組
  xAxisGroup = that.svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${that.innerHeight})`);
  yAxisGroup = that.svg.append('g').attr('class', 'y-axis');

  // 數據線條組 - 應用 clip-path
  linesGroup = that.svg.append('g') // 將引用存儲起來，方便後續操作
    .attr('class', 'lines-group')
    .attr('clip-path', 'url(#clip-rect)'); // 應用 clip-path

  // 懸停元素組 - 通常也需要裁剪，因為圓點也可能超出
  that.hoverElementsGroup = that.svg.append('g')
    .attr('class', 'hover-elements-group')
    .attr('clip-path', 'url(#clip-rect)'); // 應用 clip-path

  // Zoom behavior 和 overlay (與之前 zoom 版本相同)
  that.zoomBehavior = d3.zoom()
    .scaleExtent([1, 10])
    .extent([[0, 0], [that.innerWidth, that.innerHeight]])
    .translateExtent([[0, 0], [that.innerWidth, that.innerHeight]])
    .on("zoom", zoomed);

  that.svg.append('rect')
    .attr('class', 'overlay zoom-rect')
    .attr('width', that.innerWidth)
    .attr('height', that.innerHeight)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .on('mousemove', handleMouseMove)
    .on('mouseleave', handleMouseLeave)
    .call(that.zoomBehavior);

  updateChart();
}

// 更新圖表內容 (線條, 坐標軸)
var updateChart = function () {
  if (!that.svg || that.innerWidth <= 0 || that.innerHeight <= 0) return;

  const visibleSeries = that.chartSeriesData.filter(s => s.visible);
  // 更新 originalXScale 和 originalYScale 的 domain 以反映當前完整數據
  if (!visibleSeries.some(s => s.values.length > 0)) {
    // 無數據時的處理
    that.originalXScale.domain([new Date(), new Date(Date.now() + 1000)]);
    that.originalYScale.domain([0, 100]);
  } else {
    const allVisibleValues = visibleSeries.reduce((acc, series) => acc.concat(series.values), []);
    that.originalXScale.domain(d3.extent(allVisibleValues, d => d.time));

    const yExtent = d3.extent(allVisibleValues, d => d.value);
    let yMinDomain = 0, yMaxDomain = 100;
    if (yExtent[0] !== undefined && yExtent[1] !== undefined) {
      const dataRange = yExtent[1] - yExtent[0];
      const padding = dataRange * 0.1 || Math.abs(yExtent[0] * 0.1) || 5;
      yMinDomain = yExtent[0] - padding;
      yMaxDomain = yExtent[1] + padding;
      if (yMinDomain === yMaxDomain) {
        yMinDomain -= (Math.abs(yMinDomain * 0.2) || 10);
        yMaxDomain += (Math.abs(yMaxDomain * 0.2) || 10);
      }
    }
    that.originalYScale.domain([yMinDomain, yMaxDomain]);
  }

  // 應用當前的 zoom transform (如果有的話) 到 original scales
  // 或者如果沒有 transform，就直接使用 original scales
  const currentTransform = d3.zoomTransform(that.svg.select('.zoom-rect').node());
  if (currentTransform && currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0) {
    that.xScale = currentTransform.rescaleX(that.originalXScale);
    that.yScale = currentTransform.rescaleY(that.originalYScale);
  } else {
    that.xScale = that.originalXScale.copy();
    that.yScale = that.originalYScale.copy();
  }

  // 更新坐標軸和格線 (使用 that.xScale 和 that.yScale)
  const numXTicks = Math.max(2, Math.floor(that.innerWidth / 200));
  const numYTicks = Math.max(2, Math.floor(that.innerHeight / 50));

  xAxisGroup.attr('transform', `translate(0,${that.innerHeight})`).call(d3.axisBottom(that.xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
  yAxisGroup.call(d3.axisLeft(that.yScale).ticks(numYTicks));

  if (that.xAxisGridGroup) {
    that.xAxisGridGroup.attr('transform', `translate(0,${that.innerHeight})`).call(d3.axisBottom(that.xScale)
        .ticks(numXTicks)
        .tickSize(-that.innerHeight)
        .tickFormat("")
      );
  }
  if (that.yAxisGridGroup) {
    that.yAxisGridGroup.call(d3.axisLeft(that.yScale)
        .ticks(numYTicks)
        .tickSize(-that.innerWidth)
        .tickFormat("")
      );
  }

  // 更新線條 (使用 that.xScale 和 that.yScale)
  lineGenerator.x(d => that.xScale(d.time)).y(d => that.yScale(d.value));
  const lines = that.svg.select('.lines-group').selectAll('.line-series').data(visibleSeries, d => d.id);
  lines.exit().remove();
  lines.enter()
    .append('path')
    .attr('class', 'line-series')
    .attr('fill', 'none')
    .attr('stroke-width', '2px')
    .merge(lines)
    .style('stroke', d => d.color)
    .attr('d', d => lineGenerator(d.values));

  // 如果是無數據情況，需要單獨處理軸和格線的顯示，如之前代碼所示
  if (!visibleSeries.some(s => s.values.length > 0)) {
    that.svg.select('.lines-group').selectAll('.line-series').remove();
    if (that.hoverElementsGroup) that.hoverElementsGroup.selectAll('.hover-point-circle').remove();

    // 使用原始比例尺的空域來繪製軸和格線
    const emptyX = that.originalXScale.copy().domain([new Date(), new Date(Date.now() + 1000)]);
    const emptyY = that.originalYScale.copy().domain([0, 100]);

    xAxisGroup.attr('transform', `translate(0,${that.innerHeight})`)
      .call(d3.axisBottom(emptyX).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
    yAxisGroup.call(d3.axisLeft(emptyY).ticks(numYTicks));

    if (that.xAxisGridGroup) {
      that.xAxisGridGroup.attr('transform', `translate(0,${that.innerHeight})`)
        .call(d3.axisBottom(emptyX).ticks(numXTicks).tickSize(-that.innerHeight).tickFormat(""));
    }
    if (that.yAxisGridGroup) {
      that.yAxisGridGroup
        .call(d3.axisLeft(emptyY).ticks(numYTicks).tickSize(-that.innerWidth).tickFormat(""));
    }
    handleMouseLeave();
  }
}

// Zoom縮放
var zoomed = function (event) {
  // event.transform 包含了當前的縮放 (k) 和平移 (x, y) 信息
  const transform = event.transform;

  // 使用 transform 來重新計算 xScale 和 yScale 的 domain
  // rescaleX/Y 會返回一個新的比例尺，其 domain 已經根據 transform 調整
  that.xScale = transform.rescaleX(that.originalXScale);
  that.yScale = transform.rescaleY(that.originalYScale);

  // 更新線條 (因為 xScale/yScale 變了，lineGenerator 會使用新的比例尺)
  that.svg.select('.lines-group').selectAll('.line-series').attr('d', d => lineGenerator(d.values));

  // 更新 X 軸和 Y 軸
  const numXTicks = Math.max(2, Math.floor(that.innerWidth / 200));
  const numYTicks = Math.max(2, Math.floor(that.innerHeight / 50));
  xAxisGroup.call(d3.axisBottom(that.xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
  yAxisGroup.call(d3.axisLeft(that.yScale).ticks(numYTicks));

  // 更新格線
  if (that.xAxisGridGroup) {
    that.xAxisGridGroup
      .call(d3.axisBottom(that.xScale)
        .ticks(numXTicks)
        .tickSize(-that.innerHeight)
        .tickFormat("")
      );
  }
  if (that.yAxisGridGroup) {
    that.yAxisGridGroup
      .call(d3.axisLeft(that.yScale)
        .ticks(numYTicks)
        .tickSize(-that.innerWidth)
        .tickFormat("")
      );
  }
  handleMouseLeave();
}

// 處理鼠標在圖表上移動的事件
var handleMouseMove = function (event) {
  const visibleSeries = that.chartSeriesData.filter(s => s.visible);
  // 檢查是否有可見數據、比例尺和 SVG 是否已初始化，以及繪圖寬度是否有效
  if (!visibleSeries.some(s => s.values.length > 0) || !that.xScale || !that.svg || that.innerWidth <= 0) {
    handleMouseLeave(); // 如果條件不滿足，則隱藏 tooltip 和懸停點
    return;
  }
  let pointer;
  try {
    // 獲取鼠標相對於 SVG <g> 元素的坐標
    pointer = d3.pointer(event, that.svg.node());
  } catch (e) {
    // 如果獲取 pointer 失敗 (例如 SVG 還未完全渲染好)，則離開
    handleMouseLeave();
    return;
  }

  const pointerX = pointer[0]; // 鼠標的 X 坐標 (相對於繪圖區域)
  // 如果鼠標 X 坐標超出了繪圖區域的有效範圍，則隱藏 tooltip
  if (pointerX < 0 || pointerX > that.innerWidth) {
    handleMouseLeave();
    return;
  }

  // 將鼠標的 X 像素坐標轉換回對應的時間值
  const x0 = that.xScale.invert(pointerX);
  const hoverPointsData = []; // 存儲所有系列在 x0 時間點附近的數據
  const bisectDate = d3.bisector(d => d.time).left; // 創建一個二分查找函數，用於按時間查找

  // 遍歷所有可見系列
  visibleSeries.forEach(series => {
    if (!series.values.length) return; // 如果系列沒有數據點，則跳過
    // 找到在 x0 時間點左右的數據點索引
    const index = bisectDate(series.values, x0, 1);
    const d0 = series.values[index - 1]; // x0 左側的點
    const d1 = series.values[index];     // x0 右側的點
    let closestDataPoint; // 最接近 x0 的數據點
    // 判斷哪個點更接近 x0
    if (d0 && d1) closestDataPoint = (x0 - d0.time > d1.time - x0) ? d1 : d0;
    else if (d0) closestDataPoint = d0;
    else if (d1) closestDataPoint = d1;
    else return; // 如果沒有找到點，則跳過

    if (closestDataPoint) {
      // 將找到的點的相關信息添加到 hoverPointsData
      hoverPointsData.push({
        seriesId: series.id,
        seriesName: series.name,
        time: closestDataPoint.time, // 原始 Date 對象
        value: closestDataPoint.value,
        color: series.color,
        cx: that.xScale(closestDataPoint.time), // 計算屏幕 X 坐標
        cy: that.yScale(closestDataPoint.value), // 計算屏幕 Y 坐標
      });
    }
  });

  // 使用 D3 data join 更新懸停圓點
  const circles = that.hoverElementsGroup.selectAll('.hover-point-circle').data(hoverPointsData, d => d.seriesId); // 以 seriesId 為 key
  circles.exit().remove(); // 移除不再需要的圓點

  circles.enter().append('circle') // 為新的懸停點數據創建圓形
    .attr('class', 'hover-point-circle')
    .attr('r', 5) // 半徑
    .style('stroke', 'white') // 邊框白色
    .style('stroke-width', '1.5px') // 邊框寬度
    .merge(circles) // 合併 enter 和 update
    .attr('cx', d => d.cx) // 更新 X 位置
    .attr('cy', d => d.cy) // 更新 Y 位置
    .style('fill', d => d.color) // 填充顏色與系列一致
    .style('opacity', 1); // 設置為可見

  // 如果有懸停點數據，則更新並顯示 tooltip
  if (hoverPointsData.length > 0) {
    // Tooltip 定位相對於 .chart-wrapper-inside-card
    const positioningParent = that.$refs.chartContainerWrapper.parentElement;
    const parentRect = positioningParent.getBoundingClientRect(); // 獲取定位父元素的邊界
    let mouseXRelToParent = event.clientX - parentRect.left; // 鼠標相對於定位父元素的 X
    let mouseYRelToParent = event.clientY - parentRect.top; // 鼠標相對於定位父元素的 Y

    let tipX = mouseXRelToParent + 15; // Tooltip 初始 X (鼠標右側)
    let tipY = mouseYRelToParent - 30; // Tooltip 初始 Y (鼠標上方)

    // 估算 tooltip 的寬高以進行邊界檢測
    const tooltipItemHeight = 22;
    const tooltipPadding = 20;
    const tooltipEstimatedWidth = 220;
    const tooltipEstimatedHeight = (hoverPointsData.length * tooltipItemHeight) + tooltipPadding;

    // 邊界檢測和調整 Tooltip 位置
    if (tipX + tooltipEstimatedWidth > parentRect.width) tipX = mouseXRelToParent - tooltipEstimatedWidth - 15; // 超出右邊界
    if (tipX < 0) tipX = 5; // 超出左邊界
    if (tipY < 0) tipY = mouseYRelToParent + 15; // 超出上邊界，移到鼠標下方
    if (tipY + tooltipEstimatedHeight > parentRect.height) tipY = parentRect.height - tooltipEstimatedHeight - 5; // 超出下邊界
    if (tipY < 0) tipY = 5; // 再次檢查，防止推到頂部外面

    that.tooltip.x = tipX;
    that.tooltip.y = tipY;
    that.tooltip.data = hoverPointsData.map(d => ({ // 格式化 tooltip 數據
      seriesName: d.seriesName,
      time: d3.timeFormat("%Y-%m-%d %H:%M:%S")(d.time), // 將時間格式化
      value: d.value,
      color: d.color,
    }));
    that.tooltip.visible = true; // 顯示 tooltip
  } else {
    handleMouseLeave(); // 如果沒有懸停數據，則隱藏
  }
}

// 處理鼠標離開圖表區域的事件
var handleMouseLeave = function () {
  that.tooltip.visible = false; // 隱藏 tooltip
  that.tooltip.data = []; // 清空 tooltip 數據
  if (that.hoverElementsGroup) that.hoverElementsGroup.selectAll('.hover-point-circle').remove(); // 移除所有懸停圓點
}

export {
  initVueInfo,
  removeSVG,
  createChart,
  updateChart,
  handleMouseLeave,
}