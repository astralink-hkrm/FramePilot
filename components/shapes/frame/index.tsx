import { FrameShape } from "@/redux/slice/shapes";

export const Frame = ({ shape }: { shape: FrameShape; toggleInspiration?: () => void }) => {
  return (
    <>
      <div
        className="absolute pointer-events-none border border-[#4d5a73] bg-white/[0.025] shadow-2xl shadow-black/30"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
          borderRadius: "10px",
        }}
      />
      <div
        className="absolute pointer-events-none select-none text-[11px] font-medium text-white/55"
        style={{
          left: shape.x,
          top: shape.y - 20,
        }}
      >
        Frame {shape.frameNumber}
      </div>
    </>
  );
};