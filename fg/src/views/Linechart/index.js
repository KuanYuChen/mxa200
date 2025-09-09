import * as d3 from 'd3';

var that = null;

// 取得初始化vue thi s
var initVueInfo = function (info) {
  that = info
}

// 根據當前的全部原始數據，更新 original X、Y Scale 的 Domain
var updateOriginalScalesDomain = function () {
  const allOriginalValues = that.chartSeriesData.reduce((acc, series) => acc.concat(series.originalValues), []);
  if (allOriginalValues.length > 0) {
    if (!that.originalXScale) that.originalXScale = d3.scaleTime();
    if (!that.originalYScale) that.originalYScale = d3.scaleLinear();

    that.originalXScale.domain(d3.extent(allOriginalValues, d => d.time));

    const yExtent = d3.extent(allOriginalValues, d => d.value);
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
  } else {
    if (!that.originalXScale) that.originalXScale = d3.scaleTime();
    if (!that.originalYScale) that.originalYScale = d3.scaleLinear();
    that.originalXScale.domain([new Date(), new Date(Date.now() + 1000)]);
    that.originalYScale.domain([0, 100]);
  }
}

// 圖表更新用 (根據當前 zoom 縮放、移動狀態變換更新 X/Y Scale 並計算顯示資料 displayValues 狀態後更新曲線)
var resampleAndUpdate = function () {
  // 如果圖表未就緒則離開
  if (!that.svg || !that.originalXScale || !that.originalYScale || that.innerWidth <= 0 || that.innerHeight <= 0) return;
  const currentTransform = d3.zoomTransform(that.svg.select('.zoom-rect').node());
  that.xScale = currentTransform.rescaleX(that.originalXScale);
  that.yScale = currentTransform.rescaleY(that.originalYScale);

  const visibleDomain = that.xScale.domain();
  const zoomK = currentTransform.k;

  // --- 判斷是否處於默認的未縮放視圖 ---
  // 判斷條件：縮放因子 k === 1 並且 平移量 x 和 y 都為 0
  // 通常只需要檢查 k === 1 即可，因為 translateExtent 限制了平移，且默認狀態是 (0,0)
  const isDefaultZoomView = currentTransform.k === 1 && currentTransform.x === 0 && currentTransform.y === 0;

  const initialSamplePoints = 200 // 初始狀態或縮放比例接近1時，每條線顯示的大致點數

  // 遍歷每個系列，計算並採樣其 displayValues
  that.chartSeriesData.forEach(series => {
    if (!series.visible || !series.originalValues || series.originalValues.length === 0) {
      series.displayValues = [];
      return;
    }
    // 超過最大數值則跳過
    if (series.originalValues.length <= initialSamplePoints) {
      series.displayValues = series.originalValues;
      return;
    }

    // 過濾出落在當前可見時間範圍內的原始點
    const visibleOriginalValues = series.originalValues.filter(d => d.time >= visibleDomain[0] && d.time <= visibleDomain[1]);
    const n = visibleOriginalValues.length; // 可見範圍內的原始點數 
    let actualKToDisplay; // 最終要顯示的點數

    // --- 決定最終要顯示的點數 ---

    if (isDefaultZoomView) {
      // Case 1: 處於默認未縮放的初始視圖
      // 強制只顯示初始設定的點數，即使 n 很大
      actualKToDisplay = initialSamplePoints;
    } else {
      // Case 2: 已縮放 (不處於默認視圖)
      // 計算在採樣模式下，基於密度和縮放因子期望的目標點數
      let targetKForDensity;
      const pointsPerPixel = 0.7; // 基礎密度
      targetKForDensity = Math.floor(that.innerWidth * pointsPerPixel * Math.sqrt(zoomK));
      targetKForDensity = Math.max(initialSamplePoints, targetKForDensity); // 不少於初始點數

      // 將基於密度的目標點數，應用最大顯示點數限制 (200筆)
      const cappedKByMaxDisplay = Math.min(targetKForDensity, initialSamplePoints);
      actualKToDisplay = cappedKByMaxDisplay
      actualKToDisplay = Math.min(n, actualKToDisplay); // 確保最終點數不超過可見原始點數 n
    }

    if (actualKToDisplay < 2 && n >= 2) actualKToDisplay = 2; // 至少有 2 個點才能畫線 (如果原始可見點數 >= 2)
    else if (actualKToDisplay < 1 && n > 0) actualKToDisplay = 1; // 至少有 1 個點如果原始可見點數 > 0

    console.log("actualKToDisplay: ", actualKToDisplay, n)

    // --- 執行數據採樣 ---
    const sampledData = [];
    if (n === 0) {
      series.displayValues = [];
      return;
    }
    if (actualKToDisplay >= n) {
      sampledData.push(...visibleOriginalValues);
    } else if (actualKToDisplay === 1) {
      sampledData.push(visibleOriginalValues[Math.floor(n / 2)]);
    } else {
      const usedIndices = new Set();
      for (let i = 0; i < actualKToDisplay; i++) {
        const idx = Math.floor(i * n / actualKToDisplay);
        if (!usedIndices.has(idx)) {
          sampledData.push(visibleOriginalValues[idx]);
          usedIndices.add(idx);
        }
      }
      // 確保第一點與最後一點被包含（畫線時較自然）
      if (sampledData[0] !== visibleOriginalValues[0]) {
        sampledData.unshift(visibleOriginalValues[0]);
      }
      if (sampledData[sampledData.length - 1] !== visibleOriginalValues[n - 1]) {
        sampledData.push(visibleOriginalValues[n - 1]);
      }
    }

    // --- 去重並賦值給displayValues ---
    // 這一步驟非常重要，用於確保最終的displayValues 數組中的點是唯一的 (基於時間)
    const uniqueSampledData = [];
    const timeSet = new Set();
    sampledData.forEach(p => {
      if (p && p.time instanceof Date && !isNaN(p.time.getTime())) {
        if (!timeSet.has(p.time.getTime())) {
          timeSet.add(p.time.getTime());
          uniqueSampledData.push(p);
        }
      }
    });
    series.displayValues = uniqueSampledData;
  });
  // 數據採樣完成後，更新繪圖
  updateChart();
}

// 創建曲線圖圖表 (SVG 結構，軸，格線，Zoom 和 ClipPath)
var createChart = function () {
  if (that.currentWidth <= 0 || that.currentHeight <= 0 || !that.$refs.chartContainerWrapper || that.innerWidth <= 0 || that.innerHeight <= 0) return;

  const mainChartWrapper = that.$refs.chartContainerWrapper;
  d3.select(mainChartWrapper).select('svg').remove();
  that.svg = null;
  const { margin } = that.dimensions;

  const svgRoot = d3.select(mainChartWrapper).append('svg')
    .attr('width', that.currentWidth)
    .attr('height', that.innerHeight + margin.top + margin.bottom);

  svgRoot.append('defs').append('clipPath').attr('id', 'clip-rect').append('rect').attr('width', that.innerWidth).attr('height', that.innerHeight);
  that.svg = svgRoot.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  if (!that.originalXScale) that.originalXScale = d3.scaleTime();
  if (!that.originalYScale) that.originalYScale = d3.scaleLinear();
  that.originalXScale.range([0, that.innerWidth]);
  that.originalYScale.range([that.innerHeight, 0]);

  that.xScale = that.originalXScale.copy();
  that.yScale = that.originalYScale.copy();

  that.lineGenerator = d3.line().x(d => that.xScale(d.time)).y(d => that.yScale(d.value)).curve(d3.curveMonotoneX);

  that.yAxisGridGroup = that.svg.append('g').attr('class', 'grid y-grid');
  that.xAxisGridGroup = that.svg.append('g').attr('class', 'grid x-grid').attr('transform', `translate(0,${that.innerHeight})`);

  that.xAxisGroup = that.svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${that.innerHeight})`);
  that.yAxisGroup = that.svg.append('g').attr('class', 'y-axis');

  that.linesGroup = that.svg.append('g').attr('class', 'lines-group').attr('clip-path', 'url(#clip-rect)');
  that.hoverElementsGroup = that.svg.append('g').attr('class', 'hover-elements-group').attr('clip-path', 'url(#clip-rect)');

  that.zoomBehavior = d3.zoom()
    .scaleExtent([1, 50])
    .extent([[0, 0], [that.innerWidth, that.innerHeight]])
    .translateExtent([[0, 0], [that.innerWidth, that.innerHeight]])
    .on("zoom", that.zoomIng)
    .on("end", that.zoomEnd);

  that.svg.append('rect')
    .attr('class', 'overlay zoom-rect')
    .attr('width', that.innerWidth)
    .attr('height', that.innerHeight)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .on('mousemove', handleMouseMove)
    .on('mouseleave', handleMouseLeave)
    .call(that.zoomBehavior);
  resampleAndUpdate();
}

// 創建 Brush 圖表 (總覽圖)
var createBrushChart = function () {
  if (!that.$refs.brushContainerWrapper || that.innerWidth <= 0 || that.brushInnerHeight <= 0 || !that.originalXScale || !that.originalYScale) return;

  const brushChartWrapper = that.$refs.brushContainerWrapper;
  d3.select(brushChartWrapper).select('svg').remove();
  that.brushSvg = null;

  const { brushMargin } = that;

  const svgRoot = d3.select(brushChartWrapper).append('svg')
    .attr('width', that.currentWidth)
    .attr('height', that.brushHeight);

  that.brushSvg = svgRoot.append('g')
    .attr('transform', `translate(${brushMargin.left},${brushMargin.top})`);

  that.brushXScale = that.originalXScale.copy().range([0, that.innerWidth]);

  const allVisibleOriginalValues = that.chartSeriesData.filter(s => s.visible).reduce((acc, series) => acc.concat(series.originalValues), []);
  let brushYMinDomain = 0, brushYMaxDomain = 100;
  if (allVisibleOriginalValues.length > 0) {
    const yExtent = d3.extent(allVisibleOriginalValues, d => d.value);
    const dataRange = yExtent[1] - yExtent[0];
    const padding = dataRange * 0.1 || Math.abs(yExtent[0] * 0.1) || 5;
    brushYMinDomain = yExtent[0] - padding;
    brushYMaxDomain = yExtent[1] + padding;
    if (brushYMinDomain === brushYMaxDomain) {
      brushYMinDomain -= (Math.abs(brushYMinDomain * 0.2) || 10);
      brushYMaxDomain += (Math.abs(brushYMaxDomain * 0.2) || 10);
    }
  }
  that.brushYScale = d3.scaleLinear().domain([brushYMinDomain, brushYMaxDomain]).range([that.brushInnerHeight, 0]);

  that.brushSvg.append('g')
    .attr('class', 'x-axis-brush')
    .attr('transform', `translate(0,${that.brushInnerHeight})`)
    .call(d3.axisBottom(that.brushXScale).ticks(10).tickFormat(d3.timeFormat("%m-%d %H:%M")));

  const brushLineGenerator = d3.line()
    .x(d => that.brushXScale(d.time))
    .y(d => that.brushYScale(d.value))
    .curve(d3.curveMonotoneX);

  that.brushSvg.append('g').attr('class', 'brush-lines')
    .selectAll('path')
    .data(that.chartSeriesData.filter(s => s.visible), d => d.id)
    .join('path')
    .attr('class', 'brush-line-series')
    .attr('d', d => brushLineGenerator(d.originalValues))
    .style('fill', 'none')
    .style('stroke', d => d.color)
    .style('stroke-width', '1px');

  that.brushBehavior = d3.brushX()
    .extent([[0, 0], [that.innerWidth, that.brushInnerHeight]])
    .on("start brush end", brushed); // 修正：將所有 Brush 事件都導向brushed

  that.brushGroup = that.brushSvg.append('g')
    .attr('class', 'brush')
    .call(that.brushBehavior);

  // 初始化 Brush 選區為整個範圍
  that.brushGroup.call(that.brushBehavior.move, that.brushXScale.range());
}

// 更新曲線圖資料 (軸、格線、線條)
var updateChart = function () {
  if (!that.svg || !that.xScale || !that.yScale || that.innerWidth <= 0 || that.innerHeight <= 0) return;
  const visibleSeries = that.chartSeriesData.filter(s => s.visible);

  updateScale();
  that.lineGenerator.x(d => that.xScale(d.time)).y(d => that.yScale(d.value));
  const lines = that.linesGroup.selectAll('.line-series').data(visibleSeries, d => d.id);
  lines.exit().remove();
  lines.enter()
    .append('path')
    .attr('class', 'line-series')
    .style('fill', 'none')
    .style('stroke-width', '2px')
    .merge(lines)
    .style('stroke', d => d.color)
    .attr('d', d => that.lineGenerator(d.displayValues));
  if (visibleSeries.length === 0) that.linesGroup.selectAll('.line-series').remove();
}

// 更新 Brush 圖表線條（當 series 可見性改變時）
var updateBrushChartLines = function() {
  if (!that.brushSvg || !that.brushXScale || !that.brushYScale || that.innerWidth <= 0 || that.brushInnerHeight <= 0) return;

  const brushLineGenerator = d3.line()
    .x(d => that.brushXScale(d.time))
    .y(d => that.brushYScale(d.value))
    .curve(d3.curveMonotoneX);

  const visibleSeries = that.chartSeriesData.filter(s => s.visible);

  that.brushSvg.select('.brush-lines').selectAll('.brush-line-series')
    .data(visibleSeries, d => d.id)
    .join('path')
    .attr('class', 'brush-line-series')
    .attr('d', d => brushLineGenerator(d.originalValues))
    .style('fill', 'none')
    .style('stroke', d => d.color)
    .style('stroke-width', '1px');
}

// Zoom事件 (縮放、拖拉中)
var zoomIng = function (event) {
  // 設置 isZooming 旗標，用於避免 Brush 反向觸發
  if (!event.sourceEvent) { // 來自程式碼觸發的 zoom 事件 (如來自 brush)
    that.isZooming = true;
  } else { // 來自用戶手動操作的 zoom 事件
    that.isZooming = false; // 重置此旗標，因為我們不是從 brush 過來的
  }

  const transform = event.transform;
  that.zoomOffset = transform;
  that.xScale = transform.rescaleX(that.originalXScale);
  that.yScale = transform.rescaleY(that.originalYScale);

  if (!that.svg || !that.xScale || !that.yScale || that.innerWidth <= 0 || that.innerHeight <= 0) return;

  updateScale();

  // 如果不是由 Brush 觸發的 Zoom，則同步 Brush 的選區
  if (!that.isBrushing && that.brushGroup && that.brushBehavior) { // 使用 isBrushing 旗標
    const currentMainChartDomain = that.xScale.domain();
    const brushSelection = [that.brushXScale(currentMainChartDomain[0]), that.brushXScale(currentMainChartDomain[1])];
    // 呼叫 brushBehavior.move 不會觸發 brush.end 事件，但會觸發 brush.brush 事件
    // 我們要在 brushed 中過濾掉非用戶操作的 brush 事件
    that.brushGroup.call(that.brushBehavior.move, brushSelection);
  }

  // 數據採樣和圖表更新邏輯
  // 可以在 "end" 事件進行完整更新，或在 "zoom" 過程中根據需要進行輕量級更新
  // 目前判斷方式：滾輪縮放或縮放比例大於4時更新
  if (event.sourceEvent?.type === 'wheel' || (event.transform.k > 4 && that.xScale.domain()[0] !== that.originalXScale.domain()[0])) {
    resampleAndUpdate();
  }
  handleMouseLeave();
}

// Zoom事件 (縮放拖拉結束)
var zoomEnd = function (event) {
  // 確保在用戶操作結束後進行數據更新
  // 如果是通過 Brush 調整 Zoom，那麼 `brushed` 函數會執行 `resampleAndUpdate()`
  // 如果是直接在主圖表上操作 Zoom，則在這裡執行
  if (!that.isBrushing) { // 僅當不是由 Brush 觸發的 Zoom 結束時才觸發
    resampleAndUpdate();
  }
  that.isBrushing = false; // 重置 isBrushing 旗標
}

// Brush 的 'end' 事件處理函數 (現在也處理 'start' 和 'brush')
var brushed = function ({ selection, sourceEvent, type }) {
  if (!sourceEvent) return; // 忽略程式化調用 (例如來自 zoomIng 的調用)

  if (type === "start") {
    that.isBrushing = true; // 設置旗標，表示當前正在由 Brush 操作
  } else if (type === "end") {
    // 在 Brush 結束時觸發主圖表的 Zoom
    if (selection) {
      const [x0, x1] = selection.map(that.brushXScale.invert);
      const newZoomK = that.innerWidth / (that.originalXScale(x1) - that.originalXScale(x0));
      const newZoomX = -that.originalXScale(x0) * newZoomK;
      const newTransform = d3.zoomIdentity.translate(newZoomX, 0).scale(newZoomK);

      // 應用新的 Zoom 轉換到主圖表
      // 設置 isBrushing 旗標為 true，告訴 zoomIng 這是來自 brush 的操作
      that.isBrushing = true;
      that.svg.select('.zoom-rect').call(that.zoomBehavior.transform, newTransform);
      // 在 `zoomEnd` 中會重置 `isBrushing` 旗標
    } else {
      // 如果 Brush 選區被清除，則重置主圖表的 Zoom
      resetZoom();
    }
    // 無論 selection 如何，在 `end` 事件，只要是用戶操作，都應重新採樣
    resampleAndUpdate(); // 確保數據更新
    that.isBrushing = false; // 重置 isBrushing 旗標
  } else if (type === "brush") {
    // Brush 拖動過程中，如果需要即時更新主圖表（輕量級），可以在這裡實現
    // 為了避免過度計算，通常在 `end` 事件才做完整的 `resampleAndUpdate`
    // 但這裡我們讓它觸發 `zoomIng`，讓 `zoomIng` 中的採樣條件控制
    if (selection && !that.isZooming) { // 僅當不是由主圖表 zoom 觸發時
      const [x0, x1] = selection.map(that.brushXScale.invert);
      const newZoomK = that.innerWidth / (that.originalXScale(x1) - that.originalXScale(x0));
      const newZoomX = -that.originalXScale(x0) * newZoomK;
      const newTransform = d3.zoomIdentity.translate(newZoomX, 0).scale(newZoomK);
      // 設置 isBrushing 旗標，阻止 zoomIng 反向更新 brush
      that.isBrushing = true;
      that.svg.select('.zoom-rect').call(that.zoomBehavior.transform, newTransform);
      // 在 `zoomEnd` 或 `brushed` 的 `end` 階段會重置
    }
  }
}

// 重製Zoom縮放位置
var resetZoom = function () {
  if (that.svg && that.zoomBehavior) {
    // 設置 isBrushing 旗標，避免 Brush 反向觸發
    that.isBrushing = true;
    const zoomTarget = that.svg.select('.zoom-rect');
    zoomTarget.call(that.zoomBehavior.transform, d3.zoomIdentity);
    that.isBrushing = false; // 重置旗標

    if (that.brushGroup && that.brushXScale) {
      that.brushGroup.call(that.brushBehavior.move, that.brushXScale.range());
    }
    resampleAndUpdate();
  }
}

// 更新 X/Y 軸和格線 (使用當前的 X Scale, Y Scale)
var updateScale = function () {
  const numXTicks = Math.max(2, Math.floor(that.innerWidth / 250));
  const numYTicks = Math.max(2, Math.floor(that.innerHeight / 50));
  that.xAxisGroup.attr('transform', `translate(0,${that.innerHeight})`).call(d3.axisBottom(that.xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
  that.yAxisGroup.call(d3.axisLeft(that.yScale).ticks(numYTicks));
  if (that.xAxisGridGroup)
    that.xAxisGridGroup.attr('transform', `translate(0,${that.innerHeight})`)
      .call(d3.axisBottom(that.xScale).ticks(numXTicks).tickSize(-that.innerHeight).tickFormat(""));

  if (that.yAxisGridGroup)
    that.yAxisGridGroup.call(d3.axisLeft(that.yScale).ticks(numYTicks).tickSize(-that.innerWidth).tickFormat(""));
}

// 滑鼠移動事件 (Tooltip 和懸停圓點)
var handleMouseMove = function (event) {
  const visibleSeries = that.chartSeriesData.filter(s => s.visible);
  if (!visibleSeries.some(s => s.displayValues && s.displayValues.length > 0) || !that.xScale || !that.yScale || !that.svg || that.innerWidth <= 0) {
    handleMouseLeave();
    return;
  }
  let pointer;
  try { pointer = d3.pointer(event, that.svg.node()); }
  catch (e) { handleMouseLeave(); return; }
  const pointerX = pointer[0];
  if (pointerX < 0 || pointerX > that.innerWidth) {
    handleMouseLeave(); return;
  }
  const x0 = that.xScale.invert(pointerX);
  const hoverPointsData = [];
  const bisectDate = d3.bisector(d => d.time).left;

  visibleSeries.forEach(series => {
    if (!series.displayValues || series.displayValues.length === 0) return;
    const index = bisectDate(series.displayValues, x0, 1);
    const d0 = series.displayValues[index - 1];
    const d1 = series.displayValues[index];
    let closestDataPoint;
    if (d0 && d1) closestDataPoint = (x0 - d0.time > d1.time - x0) ? d1 : d0;
    else if (d0) closestDataPoint = d0;
    else if (d1) closestDataPoint = d1;
    else return;

    if (closestDataPoint) {
      const cx = that.xScale(closestDataPoint.time);
      const cy = that.yScale(closestDataPoint.value);
      if (isFinite(cx) && isFinite(cy)) {
        hoverPointsData.push({
          seriesId: series.id, seriesName: series.name, time: closestDataPoint.time,
          value: closestDataPoint.value, color: series.color,
          cx: cx, cy: cy,
        });
      }
    }
  });

  const circles = that.hoverElementsGroup.selectAll('.hover-point-circle').data(hoverPointsData, d => d.seriesId);
  circles.exit().remove();
  circles.enter().append('circle')
    .attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px')
    .merge(circles)
    .attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1);

  if (hoverPointsData.length > 0) {
    const positioningParent = that.$refs.chartContainerWrapper.parentElement;
    const parentRect = positioningParent.getBoundingClientRect();
    const chartRect = that.$refs.chartContainerWrapper.getBoundingClientRect();
    let mouseXRelToChart = event.clientX - chartRect.left;
    let mouseYRelToChart = event.clientY - chartRect.top;

    const tooltipItemHeight = 22; const tooltipPadding = 20;
    const tooltipEstimatedWidth = 220; const tooltipEstimatedHeight = (hoverPointsData.length * tooltipItemHeight) + tooltipPadding + (hoverPointsData.length > 0 ? 30 : 0);

    let tipX = mouseXRelToChart + chartRect.left - parentRect.left + 15;
    let tipY = mouseYRelToChart + chartRect.top - parentRect.top - tooltipEstimatedHeight - 15;

    if (tipX + tooltipEstimatedWidth > parentRect.width) tipX = mouseXRelToChart + chartRect.left - parentRect.left - tooltipEstimatedWidth - 15;
    if (tipX < 0) tipX = 5;

    if (tipY < 0) tipY = mouseYRelToChart + chartRect.top - parentRect.top + 15;
    if (tipY + tooltipEstimatedHeight > parentRect.height) tipY = parentRect.height - tooltipEstimatedHeight - 5;
    if (tipY < 0) tipY = 5;

    that.tooltip.x = tipX; that.tooltip.y = tipY;
    that.tooltip.data = hoverPointsData.map(d => ({
      seriesName: d.seriesName, time: d3.timeFormat("%Y-%m-%d %H:%M:%S")(d.time),
      value: d.value, color: d.color,
    }));
    that.tooltip.visible = true;
  } else { handleMouseLeave(); }
}

// 鼠標離開，隱藏 Tooltip 和懸停點
var handleMouseLeave = function () {
  that.tooltip.visible = false;
  that.tooltip.data = [];
  if (that.hoverElementsGroup) {
    that.hoverElementsGroup.selectAll('.hover-point-circle').remove();
  }
}

// 按鈕切換線條可見性
var toggleSeriesVisibility = function (seriesId) {
  const series = that.chartSeriesData.find(s => s.id === seriesId);
  if (series) {
    series.visible = !series.visible;
    resampleAndUpdate();
    updateBrushChartLines();
    if (that.tooltip.visible) {
      const newTooltipData = that.tooltip.data.filter(td => {
        const ts = that.chartSeriesData.find(s => s.name === td.seriesName);
        return ts && ts.visible;
      });
      if (newTooltipData.length === 0) {
        handleMouseLeave();
      } else {
        that.tooltip.data = newTooltipData;
        const visibleHoverPoints = newTooltipData.map(td => {
          const s = that.chartSeriesData.find(ser => ser.name === td.seriesName);
          if (!s || !s.displayValues) return null;
          const pointInSeries = s.displayValues.find(v => d3.timeFormat("%Y-%m-%d %H:%M:%S")(v.time) === td.time);
          if (pointInSeries && that.xScale && that.yScale) {
            const cx = that.xScale(pointInSeries.time);
            const cy = that.yScale(pointInSeries.value);
            if (isFinite(cx) && isFinite(cy)) {
              return { seriesId: s.id, cx: cx, cy: cy, color: s.color };
            }
          } return null;
        }).filter(Boolean);
        if (that.hoverElementsGroup) {
          that.hoverElementsGroup.selectAll('.hover-point-circle').data(visibleHoverPoints, d => d.seriesId)
            .join(
              enter => enter.append('circle').attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px').attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
              update => update.attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
              exit => exit.remove()
            );
        }
      }
    }
  }
}


export {
  initVueInfo,
  updateOriginalScalesDomain,
  resampleAndUpdate,
  createChart,
  createBrushChart,
  updateChart,
  updateBrushChartLines,
  zoomIng,
  zoomEnd,
  resetZoom,
  updateScale,
  handleMouseMove,
  handleMouseLeave,
  toggleSeriesVisibility,
}