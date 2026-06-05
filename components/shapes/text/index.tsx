import { TextShape } from "@/redux/slice/shapes";
import { useDispatch } from "react-redux";
import { updateShape, removeShape } from "@/redux/slice/shapes";
import { useState, useRef, useEffect } from "react";

export const Text = ({ shape }: { shape: TextShape }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(shape.text === "Type here...");
  const [tempText, setTempText] = useState(shape.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (shape.text === "Type here..." && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setIsEditing(true);
    }
  }, [shape.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (shape.text === "Type here...") {
        inputRef.current.select();
      }
    }
  }, [isEditing, shape.text]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTempText(shape.text);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (tempText.trim() === "" || tempText.trim() === "Type here...") {
      dispatch(removeShape(shape.id));
    } else if (tempText !== shape.text) {
      dispatch(updateShape({ id: shape.id, patch: { text: tempText } }));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      handleBlur();
    } else if (event.key === "Escape") {
      if (shape.text === "Type here...") {
        dispatch(removeShape(shape.id));
      } else {
        setIsEditing(false);
        setTempText(shape.text);
      }
    }
  };

  const commonStyle = {
    left: shape.x,
    top: shape.y,
    fontSize: shape.fontSize,
    fontFamily: shape.fontFamily,
    fontWeight: shape.fontWeight,
    fontStyle: shape.fontStyle,
    textAlign: shape.textAlign,
    textDecoration: shape.textDecoration,
    lineHeight: shape.lineHeight,
    letterSpacing: shape.letterSpacing,
    textTransform: shape.textTransform,
    color: shape.fill || "#ffffff",
    whiteSpace: "pre-wrap" as const,
  };

  if (isEditing) {
    return (
      <textarea
        suppressHydrationWarning
        ref={inputRef}
        className="absolute pointer-events-auto min-h-10 min-w-32 resize-none rounded bg-black/20 px-2 py-1 text-white outline-none ring-1 ring-primary/40"
        style={commonStyle}
        value={tempText}
        onChange={(event) => setTempText(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={Math.max(2, tempText.split("\n").length)}
        placeholder=""
      />
    );
  }

  return (
    <div
      className="absolute pointer-events-none cursor-text select-none rounded px-2 py-1"
      style={{
        ...commonStyle,
        userSelect: "none",
      }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      <span className="pointer-events-auto block min-h-[1em] min-w-5">{shape.text}</span>
    </div>
  );
};