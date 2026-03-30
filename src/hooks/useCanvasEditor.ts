'use client'

import { useRef, useCallback } from 'react'
import type { Canvas, FabricObject, TPointerEventInfo } from 'fabric'

export type ShapeType = 'rect' | 'circle' | 'line'

export interface ElementProps {
  id: string
  type: string
  left: number
  top: number
  width: number
  height: number
  angle: number
  opacity: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  text?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: string
  textAlign?: string
  lineHeight?: number
  rx?: number
  scaleX?: number
  scaleY?: number
}

function objToProps(obj: FabricObject): ElementProps {
  const base = {
    id: (obj as FabricObject & { id?: string }).id ?? '',
    type: obj.type ?? 'object',
    left: obj.left ?? 0,
    top: obj.top ?? 0,
    width: obj.width ?? 0,
    height: obj.height ?? 0,
    angle: obj.angle ?? 0,
    opacity: obj.opacity ?? 1,
    fill: (obj.fill as string) ?? '',
    stroke: (obj.stroke as string) ?? '',
    strokeWidth: obj.strokeWidth ?? 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = obj as any
  return {
    ...base,
    text: t.text,
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    textAlign: t.textAlign,
    lineHeight: t.lineHeight,
    rx: t.rx,
  }
}

export function useCanvasEditor() {
  const canvasRef = useRef<Canvas | null>(null)

  const initCanvas = useCallback(
    async (
      el: HTMLCanvasElement,
      width: number,
      height: number,
      onSelectionChange?: (props: ElementProps | null) => void,
    ) => {
      const { Canvas: FabricCanvas } = await import('fabric')
      if (canvasRef.current) {
        canvasRef.current.dispose()
      }
      const canvas = new FabricCanvas(el, {
        width,
        height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      })
      canvasRef.current = canvas

      const notifySelection = () => {
        const obj = canvas.getActiveObject()
        onSelectionChange?.(obj ? objToProps(obj) : null)
      }

      canvas.on('selection:created', notifySelection)
      canvas.on('selection:updated', notifySelection)
      canvas.on('selection:cleared', () => onSelectionChange?.(null))
      canvas.on('object:modified', notifySelection)

      return canvas
    },
    [],
  )

  const addText = useCallback(async (text: string, style?: Partial<ElementProps>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { IText } = await import('fabric')
    const t = new IText(text, {
      left: (canvas.width ?? 200) / 2 - 100,
      top: (canvas.height ?? 200) / 2 - 20,
      fontFamily: style?.fontFamily ?? 'Arial',
      fontSize: style?.fontSize ?? 48,
      fill: style?.fill ?? '#000000',
      fontWeight: style?.fontWeight ?? 'normal',
      textAlign: (style?.textAlign ?? 'left') as 'left' | 'center' | 'right' | 'justify',
      lineHeight: style?.lineHeight ?? 1.2,
      opacity: style?.opacity ?? 1,
    })
    ;(t as unknown as { id: string }).id = crypto.randomUUID()
    canvas.add(t)
    canvas.setActiveObject(t)
    canvas.renderAll()
  }, [])

  const addImage = useCallback(async (url: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { FabricImage } = await import('fabric')
    const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
    const maxW = (canvas.width ?? 400) * 0.8
    const maxH = (canvas.height ?? 400) * 0.8
    const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1))
    img.scale(scale)
    img.set({
      left: ((canvas.width ?? 400) - (img.width ?? 0) * scale) / 2,
      top: ((canvas.height ?? 400) - (img.height ?? 0) * scale) / 2,
    })
    ;(img as unknown as { id: string }).id = crypto.randomUUID()
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
  }, [])

  const addShape = useCallback(async (type: ShapeType, color = '#22c55e') => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { Rect, Circle, Line } = await import('fabric')
    const cx = (canvas.width ?? 400) / 2
    const cy = (canvas.height ?? 400) / 2
    let obj: FabricObject
    if (type === 'rect') {
      obj = new Rect({ left: cx - 80, top: cy - 50, width: 160, height: 100, fill: color, rx: 0 })
    } else if (type === 'circle') {
      obj = new Circle({ left: cx - 60, top: cy - 60, radius: 60, fill: color })
    } else {
      obj = new Line([cx - 80, cy, cx + 80, cy], {
        stroke: color,
        strokeWidth: 4,
        fill: '',
      })
    }
    ;(obj as unknown as { id: string }).id = crypto.randomUUID()
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
  }, [])

  const setBackground = useCallback(async (colorOrUrl: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (colorOrUrl.startsWith('http') || colorOrUrl.startsWith('/') || colorOrUrl.startsWith('data:')) {
      const { FabricImage } = await import('fabric')
      const img = await FabricImage.fromURL(colorOrUrl, { crossOrigin: 'anonymous' })
      img.scaleToWidth(canvas.width ?? 400)
      img.scaleToHeight(canvas.height ?? 400)
      canvas.backgroundImage = img
    } else {
      canvas.backgroundImage = undefined
      canvas.backgroundColor = colorOrUrl
    }
    canvas.renderAll()
  }, [])

  const removeSelected = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj) {
      canvas.remove(obj)
      canvas.discardActiveObject()
      canvas.renderAll()
    }
  }, [])

  const exportAsPNG = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise((resolve) => {
      canvas.getElement().toBlob((blob) => resolve(blob), 'image/png')
    })
  }, [])

  const exportAsJPG = useCallback(async (quality = 0.92): Promise<Blob | null> => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return new Promise((resolve) => {
      canvas.getElement().toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    })
  }, [])

  const getSelectedElement = useCallback((): ElementProps | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const obj = canvas.getActiveObject()
    return obj ? objToProps(obj) : null
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateElement = useCallback((_id: string, props: Partial<ElementProps> & Record<string, any>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (!obj) return
    const { id: _skip, type: _skip2, scaleX: _sx, scaleY: _sy, ...rest } = props
    obj.set(rest as Partial<FabricObject>)
    obj.setCoords()
    canvas.renderAll()
  }, [])

  const loadTemplate = useCallback(async (templateData: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    await canvas.loadFromJSON(templateData)
    canvas.renderAll()
  }, [])

  const toJSON = useCallback((): string => {
    const canvas = canvasRef.current
    if (!canvas) return '{}'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return JSON.stringify((canvas as any).toJSON(['id']))
  }, [])

  const fromJSON = useCallback(async (data: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    await canvas.loadFromJSON(data)
    canvas.renderAll()
  }, [])

  const bringForward = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj) {
      canvas.bringObjectForward(obj)
      canvas.renderAll()
    }
  }, [])

  const sendBackward = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obj = canvas.getActiveObject()
    if (obj) {
      canvas.sendObjectBackwards(obj)
      canvas.renderAll()
    }
  }, [])

  const dispose = useCallback(() => {
    canvasRef.current?.dispose()
    canvasRef.current = null
  }, [])

  return {
    initCanvas,
    addText,
    addImage,
    addShape,
    setBackground,
    removeSelected,
    exportAsPNG,
    exportAsJPG,
    getSelectedElement,
    updateElement,
    loadTemplate,
    toJSON,
    fromJSON,
    bringForward,
    sendBackward,
    dispose,
  }
}
