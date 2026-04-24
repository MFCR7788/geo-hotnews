import { useRef, useEffect } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, RadarChart } from 'echarts/charts'
import {
  TooltipComponent,
  GridComponent,
  RadarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, RadarChart, TooltipComponent, GridComponent, RadarComponent, CanvasRenderer])

export function createLinearGradient(
  x0: number, y0: number, x1: number, y1: number,
  colorStops: Array<{ offset: number; color: string }>
) {
  return new echarts.graphic.LinearGradient(x0, y0, x1, y1, colorStops)
}

export function useECharts(containerRef: React.RefObject<HTMLDivElement>) {
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
    }
  }, [])

  function init() {
    if (!containerRef.current) return
    chartRef.current = echarts.init(containerRef.current)
  }

  function setOption(option: Record<string, unknown>, notMerge?: boolean) {
    chartRef.current?.setOption(option, notMerge)
  }

  function resize() {
    chartRef.current?.resize()
  }

  return { init, setOption, resize }
}
