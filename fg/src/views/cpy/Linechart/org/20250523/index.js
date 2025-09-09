import * as d3 from 'd3';

var that = null;
// 曲線圖參數
var xScale = null;            // D3 當前 X軸比例尺 (會被 zoom 影響)
var yScale = null;            // D3 當前 Y軸比例尺 (會被 zoom 影響)
var originalXScale = null     // D3 原始未縮放 X軸比例尺 (domain 基於全部數據)
var originalYScale = null     // D3 原始未縮放 Y軸比例尺 (domain 基於全部數據)
var lineGenerator = null      // D3 線條生成器
var xAxisGroup = null         // D3 X軸 <g> 元素的引用
var yAxisGroup = null         // D3 Y軸 <g> 元素的引用
var xAxisGridGroup = null     // D3 X軸格線 <g> 元素的引用
var yAxisGridGroup = null     // D3 Y軸格線 <g> 元素的引用
var linesGroup = null         // D3 線條組 <g> 元素的引用 (應用 clip-path)
var hoverElementsGroup = null // 存儲所有懸停圓點的 <g> 元素 (應用 clip-path)

// 取得初始化vue thi s
var initVueInfo = function (info) {
  that = info
}

// 清除曲線圖 SVG
var clearChartSVG = function () {
  d3.select(that.$refs.chartContainerWrapper).select('svg').remove();
  that.svg = null;
  if (originalXScale) originalXScale.range([0, that.innerWidth]);
  if (originalYScale) originalYScale.range([that.innerHeight, 0]);
}

// 設定曲線圖顏色
var setLinechartColor = function () {
  var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
  // 遍歷 chartSeriesData，為每個系列分配顏色
  that.chartSeriesData.forEach((series) => {
    series.color = colorScale(series.id); // 使用系列ID作為顏色比例尺的輸入，確保顏色一致性
  });
}

// 設定曲線時間格式
var setChartTimeFormate = function (timeFormat) {
  let base = timeFormat.trim();
  // 如果是只有日期
  if (/^\d{4}-\d{2}-\d{2}$/.test(base)) base += 'T00:00:00';
  // 如果是 日期+小時
  else if (/^\d{4}-\d{2}-\d{2} \d{2}$/.test(base)) base = base.replace(' ', 'T') + ':00:00';
  // 如果是 日期+小時:分鐘
  else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(base)) base = base.replace(' ', 'T') + ':00';
  // 如果已經是完整格式就不處理
  return base;
}

// 根據當前的全部原始數據，更新 original X、Y Scale 的 Domain
var updateOriginalScalesDomain = function () {
  const allOriginalValues = that.chartSeriesData.reduce((acc, series) => acc.concat(series.originalValues), []);
  if (allOriginalValues.length > 0) {
    if (!originalXScale) originalXScale = d3.scaleTime();
    if (!originalYScale) originalYScale = d3.scaleLinear();

    originalXScale.domain(d3.extent(allOriginalValues, d => d.time));

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
    originalYScale.domain([yMinDomain, yMaxDomain]);
  } else {
    // 設置默認 domain
    if (!originalXScale) originalXScale = d3.scaleTime();
    if (!originalYScale) originalYScale = d3.scaleLinear();
    originalXScale.domain([new Date(), new Date(Date.now() + 1000)]);
    originalYScale.domain([0, 100]);
  }
}

// 圖表更新用 (根據當前 zoom 縮放、移動狀態變換更新 X/Y Scale 並計算顯示資料 displayValues 狀態後更新曲線)
var resampleAndUpdate = function () {
  // 如果圖表未就緒則離開
  if (!that.svg || !originalXScale || !originalYScale || that.innerWidth <= 0 || that.innerHeight <= 0) return;
  const currentTransform = d3.zoomTransform(that.svg.select('.zoom-rect').node());
  xScale = currentTransform.rescaleX(originalXScale);
  yScale = currentTransform.rescaleY(originalYScale);

  const visibleDomain = xScale.domain();
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

    // --- 執行數據採樣 (old) ---
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

    // --- 執行數據採樣 (new) ---
    // const sampledData = [];
    // if (n === 0) {
    //   series.displayValues = [];
    //   return;
    // }
    // // 如果最終目標點數大於等於可見原始點數，或者 可見原始點數 <= 全顯示閾值 (這部分邏輯已移到前面計算 actualKToDisplay 時)
    // // 這裡只根據 actualKToDisplay 和 n 的最終值來決定如何採樣
    // if (actualKToDisplay >= n) sampledData.push(...visibleOriginalValues);
    // else {
    //   // 執行改進的均勻採樣 (actualKToDisplay > 2 且 actualKToDisplay < n)
    //   const usedIndices = new Set();
    //   // 始終包含第一個點的索引
    //   if (!usedIndices.has(0)) {
    //     sampledData.push(visibleOriginalValues[0]);
    //     usedIndices.add(0);
    //   }
    //   const step = (n - 1) / (actualKToDisplay - 1); // 步長基於總點數和目標點數
    //   // 採樣中間點 (從 i = 1 到 actualKToDisplay - 2)
    //   for (let i = 1; i < actualKToDisplay - 1; i++) {
    //     const originalIndex = Math.round(i * step);
    //     // 確保索引有效且沒有被使用過
    //     if (originalIndex > 0 && originalIndex < n - 1 && !usedIndices.has(originalIndex)) {
    //       sampledData.push(visibleOriginalValues[originalIndex]);
    //       usedIndices.add(originalIndex);
    //     }
    //   }
    //   // 始終包含最後一個點的索引
    //   if (!usedIndices.has(n - 1)) {
    //     sampledData.push(visibleOriginalValues[n - 1]);
    //     usedIndices.add(n - 1);
    //   }
    //   const percentagesToInclude = [0.6, 0.7, 0.8, 0.9]; // 你想要的百分比位置 (10%, 20%, ..., 90%)
    //   percentagesToInclude.forEach(percentage => {
    //     // 計算對應百分比的索引 (基於 n-1，確保到達最後一個點)
    //     const percentageIndex = Math.floor((n - 1) * percentage); // 使用 floor 或 round
    //     // 確保索引有效且沒有被使用過
    //     if (percentageIndex > 0 && percentageIndex < n - 1 && !usedIndices.has(percentageIndex)) { // 只在中間範圍添加
    //       console.log("percentageIndex: ", series.originalValues[percentageIndex])
    //       sampledData.push(series.originalValues[percentageIndex]);
    //       usedIndices.add(percentageIndex);
    //     }
    //   });
    //   // 進行排序，因為添加順序可能不是時間順序（由於去重和獨立添加首尾點）
    //   sampledData.sort((a, b) => a.time.getTime() - b.time.getTime());
    // }

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
  that.updateChart();
}


// 創建曲線圖圖表 (SVG 結構，軸，格線，Zoom 和 ClipPath)
var createChart = function () {
  if (that.currentWidth <= 0 || that.currentHeight <= 0 || !that.$refs.chartContainerWrapper || that.innerWidth <= 0 || that.innerHeight <= 0) return;
  d3.select(that.$refs.chartContainerWrapper).select('svg').remove();
  that.svg = null;
  const { top, left } = that.chartMargin;

  const svgRoot = d3.select(that.$refs.chartContainerWrapper).append('svg').attr('width', that.currentWidth).attr('height', that.currentHeight);
  svgRoot.append('defs').append('clipPath').attr('id', 'clip-rect').append('rect').attr('width', that.innerWidth).attr('height', that.innerHeight);
  that.svg = svgRoot.append('g').attr('transform', `translate(${left},${top})`);

  // 確保 original scales 存在，並設置它們的 Range
  if (!originalXScale) originalXScale = d3.scaleTime();
  if (!originalYScale) originalYScale = d3.scaleLinear();
  originalXScale.range([0, that.innerWidth]);
  originalYScale.range([that.innerHeight, 0]);

  // X Scale 和 Y Scale 根據 zoom 變換設置
  xScale = originalXScale.copy();
  yScale = originalYScale.copy();

  lineGenerator = d3.line().x(d => xScale(d.time)).y(d => yScale(d.value)).curve(d3.curveMonotoneX);

  yAxisGridGroup = that.svg.append('g').attr('class', 'grid y-grid');
  xAxisGridGroup = that.svg.append('g').attr('class', 'grid x-grid').attr('transform', `translate(0,${that.innerHeight})`);

  xAxisGroup = that.svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${that.innerHeight})`);
  yAxisGroup = that.svg.append('g').attr('class', 'y-axis');

  linesGroup = that.svg.append('g').attr('class', 'lines-group').attr('clip-path', 'url(#clip-rect)');
  hoverElementsGroup = that.svg.append('g').attr('class', 'hover-elements-group').attr('clip-path', 'url(#clip-rect)');

  // 創建和配置 Zoom Behavior
  that.zoomBehavior = d3.zoom()
    .scaleExtent([1, 50]) // *** 設置縮放範圍 [1, 50] ***
    .extent([[0, 0], [that.innerWidth, that.innerHeight]])
    .translateExtent([[0, 0], [that.innerWidth, that.innerHeight]])
    .on("zoom", zoomIng)
    .on("end", zoomEnd);

  // 應用 Zoom Behavior
  that.svg.append('rect')
    .attr('class', 'overlay zoom-rect')
    .attr('width', that.innerWidth)
    .attr('height', that.innerHeight)
    .style('fill', 'none')
    .style('pointer-events', 'all')
    .on('mousemove', that.handleMouseMove)
    .on('mouseleave', that.handleMouseLeave)
    .call(that.zoomBehavior)

  that.updateChart();
  that.resampleAndUpdate()
}

// 更新曲線圖資料 (軸、格線、線條)
var updateChart = function () {
  if (!that.svg || !xScale || !yScale || that.innerWidth <= 0 || that.innerHeight <= 0) return;
  const visibleSeries = that.chartSeriesData.filter(s => s.visible);

  // 更新 X/Y 軸和格線 (使用當前的 X Scale, Y Scale)
  that.updateScale();
  // 更新線條生成器以使用當前的 scales
  lineGenerator.x(d => xScale(d.time)).y(d => yScale(d.value));
  // 更新線條
  const lines = linesGroup.selectAll('.line-series').data(visibleSeries, d => d.id);
  lines.exit().remove();
  lines.enter()
    .append('path')
    .attr('class', 'line-series')
    .style('fill', 'none')
    .style('stroke-width', '2px')
    .merge(lines)
    .style('stroke', d => d.color)
    .attr('d', d => lineGenerator(d.displayValues)); // *** 使用 displayValues列表繪製 ***
  // 如果沒有任何系列是可見的，則清空線條
  if (visibleSeries.length === 0) linesGroup.selectAll('.line-series').remove();
}

// Zoom事件 (縮放、拖拉中)
var zoomIng = function (event) {
  const transform = event.transform;
  that.zoomOffset = transform; // 更新 zoomOffset
  // 更新當前的 X Scale 和 YScale
  xScale = transform.rescaleX(originalXScale);
  yScale = transform.rescaleY(originalYScale);
  if (!that.svg || !xScale || !yScale || that.innerWidth <= 0 || that.innerHeight <= 0) return;
  that.updateScale();
  if (event.sourceEvent?.type === 'wheel') that.resampleAndUpdate(); // 在滾輪縮放狀態下可更新資料
  else if (event.transform.k > 4) that.resampleAndUpdate(); // 在拖拉狀態下，當縮放比例大於 4 時更新資料
  that.handleMouseLeave(); // 縮放時隱藏Tooltip
}

// Zoom事件 (縮放拖拉結束)
var zoomEnd = function (event) {
  if (event.sourceEvent?.type === 'mouseup') that.resampleAndUpdate(); // 在拖拉結束時更新資料
}

// 重製Zoom縮放位置
var resetZoom = function () {
  // 確保 SVG 和 zoom behavior 已經創建
  if (that.svg && that.zoomBehavior) {
    const zoomTarget = that.svg.select('.zoom-rect');
    zoomTarget.call(that.zoomBehavior.transform, d3.zoomIdentity);
    // 應用 d3.zoomIdentity 會觸發 'zoom' 和 'end' 事件，
    // 最終觸發 resampleAndUpdate -> updateChart，將圖表重繪為初始狀態
    that.resampleAndUpdate();
  }
}

// 更新 X/Y 軸和格線 (使用當前的 X Scale, Y Scale)
var updateScale = function () {
  const numXTicks = Math.max(2, Math.floor(that.innerWidth / 250));
  const numYTicks = Math.max(2, Math.floor(that.innerHeight / 50));
  xAxisGroup.attr('transform', `translate(0,${that.innerHeight})`).call(d3.axisBottom(xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
  yAxisGroup.call(d3.axisLeft(yScale).ticks(numYTicks));
  if (xAxisGridGroup)
    xAxisGridGroup.attr('transform', `translate(0,${that.innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(numXTicks).tickSize(-that.innerHeight).tickFormat(""));

  if (yAxisGridGroup)
    yAxisGridGroup.call(d3.axisLeft(yScale).ticks(numYTicks).tickSize(-that.innerWidth).tickFormat(""));
}

// 滑鼠移動事件 (Tooltip 和懸停圓點)
var handleMouseMove = function (event) {
  const visibleSeries = that.chartSeriesData.filter(s => s.visible);
  if (!visibleSeries.some(s => s.displayValues && s.displayValues.length > 0) || !xScale || !yScale || !that.svg || that.innerWidth <= 0) {
    that.handleMouseLeave();
    return;
  }
  let pointer;
  try { pointer = d3.pointer(event, that.svg.node()); }
  catch (e) { that.handleMouseLeave(); return; }
  const pointerX = pointer[0];
  if (pointerX < 0 || pointerX > that.innerWidth) {
    that.handleMouseLeave(); return;
  }
  const x0 = xScale.invert(pointerX);
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
      const cx = xScale(closestDataPoint.time);
      const cy = yScale(closestDataPoint.value);
      if (isFinite(cx) && isFinite(cy)) {
        hoverPointsData.push({
          seriesId: series.id, seriesName: series.name, time: closestDataPoint.time,
          value: closestDataPoint.value, color: series.color,
          cx: cx, cy: cy,
        });
      }
    }
  });

  const circles = hoverElementsGroup.selectAll('.hover-point-circle').data(hoverPointsData, d => d.seriesId);
  circles.exit().remove();
  circles.enter().append('circle')
    .attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px')
    .merge(circles)
    .attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1);

  if (hoverPointsData.length > 0) {
    const positioningParent = that.$refs.chartContainerWrapper.parentElement;
    const parentRect = positioningParent.getBoundingClientRect();
    let mouseXRelToParent = event.clientX - parentRect.left;
    let mouseYRelToParent = event.clientY - parentRect.top;
    let tipX = mouseXRelToParent + 15; let tipY = mouseYRelToParent - 30;
    const tooltipItemHeight = 22; const tooltipPadding = 20;
    const tooltipEstimatedWidth = 220; const tooltipEstimatedHeight = (hoverPointsData.length * tooltipItemHeight) + tooltipPadding;
    if (tipX + tooltipEstimatedWidth > parentRect.width) tipX = mouseXRelToParent - tooltipEstimatedWidth - 15;
    if (tipX < 0) tipX = 5;
    if (tipY < 0) tipY = mouseYRelToParent + 15;
    if (tipY + tooltipEstimatedHeight > parentRect.height) tipY = parentRect.height - tooltipEstimatedHeight - 5;
    if (tipY < 0) tipY = 5;
    that.tooltipInfo.x = tipX; that.tooltipInfo.y = tipY;
    that.tooltipInfo.data = hoverPointsData.map(d => ({
      seriesName: d.seriesName, time: d3.timeFormat("%Y-%m-%d %H:%M:%S")(d.time),
      value: d.value, color: d.color,
    }));
    that.tooltipInfo.visible = true;
  } else { that.handleMouseLeave(); }
}

// 鼠標離開，隱藏 Tooltip 和懸停點
var handleMouseLeave = function () {
  that.tooltipInfo.visible = false;
  that.tooltipInfo.data = [];
  if (hoverElementsGroup) hoverElementsGroup.selectAll('.hover-point-circle').remove();
}

// 按鈕切換線條可見性
var toggleSeriesVisibility = function (seriesId) {
  const series = that.chartSeriesData.find(s => s.id === seriesId);
  if (series) {
    series.visible = !series.visible;
    that.resampleAndUpdate(); // 可見性改變，只需要重繪，不需要重新採樣（除非你希望隱藏後完全移除數據）
    // 更新 Tooltip (如果可見)
    if (that.tooltipInfo.visible) {
      const newTooltipData = that.tooltipInfo.data.filter(td => {
        const ts = that.chartSeriesData.find(s => s.name === td.seriesName);
        return ts && ts.visible;
      });
      if (newTooltipData.length === 0) that.handleMouseLeave();
      else {
        that.tooltipInfo.data = newTooltipData;
        const visibleHoverPoints = newTooltipData.map(td => {
          const s = that.chartSeriesData.find(ser => ser.name === td.seriesName);
          if (!s || !s.displayValues) return null;
          const pointInSeries = s.displayValues.find(v => d3.timeFormat("%Y-%m-%d %H:%M:%S")(v.time) === td.time);
          if (pointInSeries && xScale && yScale) {
            const cx = xScale(pointInSeries.time);
            const cy = yScale(pointInSeries.value);
            if (isFinite(cx) && isFinite(cy)) {
              return { seriesId: s.id, cx: cx, cy: cy, color: s.color };
            }
          } return null;
        }).filter(Boolean);
        if (hoverElementsGroup) {
          hoverElementsGroup.selectAll('.hover-point-circle').data(visibleHoverPoints, d => d.seriesId)
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
  clearChartSVG,
  setLinechartColor,
  setChartTimeFormate,
  updateOriginalScalesDomain,
  resampleAndUpdate,
  createChart,
  updateChart,
  resetZoom,
  updateScale,
  handleMouseMove,
  handleMouseLeave,
  toggleSeriesVisibility,
}