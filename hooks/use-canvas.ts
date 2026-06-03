import { useCallback, useState } from "react"

import type { FrameShape } from "@/redux/slice/shapes"

export function useFrame(_shape: FrameShape) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateDesign = useCallback(async () => {
    setIsGenerating(true)
    try {
      await Promise.resolve()
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { isGenerating, handleGenerateDesign }
}
