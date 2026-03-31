"use client";

const LETTER_LOWER_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const LETTER_UPPER_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

const SYMBOL_ROWS = [
  ["[", "]", "{", "}", "(", ")", "#", "@", "%", "&"],
  ["+", "-", "=", "_", "/", "\\", "*", "^", "~", "|"],
  [".", ",", "?", "!", ":", ";", "€", "£", "¥", "•"],
];

// Keep "123" mostly numbers, but still allow a few common punctuation keys.
const NUMBER_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  [".", ",", "?", "!", "@", "#", "$", "%", "&", "*"],
  ["-", "/", "(", ")", ":", ";", "+", "=", "_", '"'],
];

// Dial-only mode: digits + *, +, 0, #
const DIAL_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "+", "0"],
  [null, "#", null],
];

const MODES = {
  lower: { label: "abc", rows: LETTER_LOWER_ROWS },
  upper: { label: "ABC", rows: LETTER_UPPER_ROWS },
  symbols: { label: "Sym", rows: SYMBOL_ROWS },
  numbers: { label: "123", rows: NUMBER_ROWS },
  dial: { label: "Dial", rows: DIAL_ROWS },
};

export default function SmartKeyboard({
  keyboardMode,
  onChangeMode,
  onKeyPress,
  showModeTabs = true,
  allowedModes = null,
  showSpaceButton = true,
  showSendButton = true,
}) {
  const mode = MODES[keyboardMode] || MODES.lower;
  const rows = mode.rows;
  const hasSpace = Boolean(showSpaceButton);
  const hasSend = Boolean(showSendButton);
  const onlyBack = !hasSpace && !hasSend;

  const modesToShow = showModeTabs
    ? (allowedModes && allowedModes.length ? allowedModes : ["lower", "upper", "symbols", "numbers", "dial"])
    : [];

  return (
    <div className="msg-keyboard">
      {showModeTabs && (
        <div className="msg-kb-mode">
          {modesToShow.map((m) => (
            <button
              key={m}
              type="button"
              className={keyboardMode === m ? "msg-kb-mode-btn active" : "msg-kb-mode-btn"}
              onClick={() => onChangeMode && onChangeMode(m)}
            >
              {MODES[m].label}
            </button>
          ))}
        </div>
      )}

      <div className="msg-kb-grid">
        {rows.map((row, idx) => (
          <div key={idx} className="msg-kb-row">
            {row.map((k, j) => {
              if (k == null) {
                return <div key={`${idx}-${j}`} className="msg-kb-key msg-kb-key--empty" />;
              }
              return (
                <button
                  key={k + "-" + idx + "-" + j}
                  type="button"
                  className="msg-kb-key"
                  onClick={() => onKeyPress && onKeyPress(k)}
                >
                  {k}
                </button>
              );
            })}
          </div>
        ))}

        <div className="msg-kb-row msg-kb-bottom">
          <button
            type="button"
            className={
              onlyBack ? "msg-kb-key msg-kb-key--onlyback" : "msg-kb-key msg-kb-key--small"
            }
            onClick={() => onKeyPress && onKeyPress("BACK")}
          >
            ⌫
          </button>

          {hasSpace && (
            <button
              type="button"
              className="msg-kb-key msg-kb-key--space"
              onClick={() => onKeyPress && onKeyPress("SPACE")}
            >
              space
            </button>
          )}

          {hasSend && (
            <button
              type="button"
              className="msg-kb-key msg-kb-key--send"
              onClick={() => onKeyPress && onKeyPress("SEND")}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

