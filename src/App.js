import "./App.css";
import { Fragment, useEffect, useRef, useState } from "react";
import SearchBox from "./searchBox";
import autosize from "autosize";

const getNearestAtData = (str, pos) => {
  let curr = pos;
  let qString = "";
  while (curr >= 0) {
    const _c = str[curr];
    if (_c == "@") {
      return {
        position: curr,
        query: qString,
      };
    } else {
      qString = `${_c}${qString}`;
      curr--;
    }
  }
  return null;
};

const getCursorXY = (input, selectionPoint) => {
  const { offsetLeft: inputX, offsetTop: inputY } = input;

  // create a dummy element that will be a clone of our input
  const div = document.createElement("div");
  // get the computed style of the input and clone it onto the dummy element
  const copyStyle = getComputedStyle(input);
  for (const prop of copyStyle) {
    div.style[prop] = copyStyle[prop];
  }
  // we need a character that will replace whitespace when filling our dummy element if it's a single line <input/>
  const swap = ".";
  const inputValue =
    input.tagName === "INPUT" ? input.value.replace(/ /g, swap) : input.value;
  // set the div content to that of the textarea up until selection
  const textContent = inputValue.substr(0, selectionPoint);
  // set the text content of the dummy element div
  div.textContent = textContent;
  if (input.tagName === "TEXTAREA") div.style.height = "auto";
  // if a single line input then the div needs to be single line and not break out like a text area
  if (input.tagName === "INPUT") div.style.width = "auto";
  // create a marker element to obtain caret position
  const span = document.createElement("span");
  // give the span the textContent of remaining content so that the recreated dummy element is as close as possible
  span.textContent = inputValue.substr(selectionPoint) || ".";
  // append the span marker to the div
  div.appendChild(span);
  div.style.backgroundColor = "red";
  // append the dummy element to the body
  input.parentNode.insertBefore(div, input.nextSibling);
  // get the marker position, this is the caret position top and left relative to the input
  const { offsetLeft: spanX, offsetTop: spanY } = span;
  // lastly, remove that dummy element
  // NOTE:: can comment this out for debugging purposes if you want to see where that span is rendered
  input.parentNode.removeChild(div);
  // return an object with the x and y of the caret. account for input positioning so that you don't need to wrap the input
  return {
    x: inputX + spanX,
    y: inputY + spanY,
  };
};

const checkSpecialCharacters = (s) =>
  /[^`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~\]\[\n]*[\]`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~\[\n][^`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~\]\[\n]*/g.test(
    s
  );

const checkAtSignAvailable = (s, pos) => pos == 0 || /\s/.test(s[pos - 1]);

function App() {
  const [prevValue, setPrevValue] = useState();
  const [value, setValue] = useState(new String(""));
  const [prevSelection, setPrevSelection] = useState(undefined);
  const [atPos, setAtPos] = useState();
  // const [hasInput, setHasInput] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [height, setHeight] = useState("auto");

  const searchBoxRef = useRef();
  const textAreaRef = useRef();
  const hasInputRef = useRef(false);

  const onKeyDown = (e) => {
    const { selectionStart, selectionEnd } = e.target;
    // autosize(e.target);
    // setHeight(e.target.style.height);
    setPrevSelection({
      selectionStart,
      selectionEnd,
    });
  };

  const onInput = (e) => {
    const { value: eValue } = e.target;

    // setHasInput(true);
    hasInputRef.current = true
    setPrevValue(value);
    setValue(new String(eValue));
  };

  const modifyMentions = (newInput, { start, end }) => {
    setMentions((prev) => {
      const newValue = [];
      const diff = newInput.length - prevValue.valueOf().length;
      for (const m of prev) {
        if (
          (diff < 0 && m.end < start) ||
          (diff > 0 && m.end < prevSelection.selectionStart)
        ) {
          newValue.push(m);
        } else if (m.start > prevSelection.selectionEnd) {
          newValue.push({
            start: m.start + diff,
            end: m.end + diff,
          });
        }
      }
      return newValue;
    });
  };

  const _reset = () => {
    setAtPos();
    searchBoxRef.current?.setQuery();
  };

  useEffect(() => {
    const { y } = getCursorXY(textAreaRef.current, atPos);
    searchBoxRef.current?.setYPos(y + 18);
  }, [atPos]);

  const checkMentionTag = (v, end) => {
    const _curr = v[end - 1];
    if (_curr == "@" && checkAtSignAvailable(v, end - 1)) {
      setAtPos(end - 1);
    } else if (!isNaN(Number(atPos))) {
      const _q = v.substring(atPos + 1, end);
      if (!checkSpecialCharacters(_q)) {
        searchBoxRef.current?.setQuery(_q);
      } else {
        _reset();
      }
    } else {
      const nearestAt = getNearestAtData(v, atPos);
      if (
        !isNaN(nearestAt?.position) &&
        checkAtSignAvailable(v, nearestAt.position) &&
        !checkSpecialCharacters(nearestAt.query)
      ) {
        setAtPos(nearestAt.position);
        searchBoxRef.current?.setQuery(nearestAt.query);
      }
    }
  };

  const onKeyUp = (e) => {
    const {
      selectionStart: tStart,
      selectionEnd: tEnd,
      value: tValue,
    } = e.target;

    if (tEnd <= atPos) {
      _reset();
    } else if (hasInputRef.current) {
      modifyMentions(tValue, { start: tStart, end: tEnd });
      checkMentionTag(tValue, tEnd);
    }

    // setHasInput(false);
    hasInputRef.current = false
  };

  const onClick = (e) => {
    const { selectionStart, selectionEnd } = e.target;
    setPrevSelection({
      selectionStart,
      selectionEnd,
    });
  };

  const onMention = (user) => {
    const pString = prevValue?.valueOf();
    if (!pString) return;
    const nextString = [
      pString.slice(0, atPos),
      user,
      pString.slice(prevSelection.selectionEnd),
    ].join("");
    setValue(new String(nextString));
    setMentions((prev) => {
      return [...prev, { start: atPos, end: atPos + user.length - 1 }].sort(
        (a, b) => a.start - b.start
      );
    });
    textAreaRef.current?.setSelectionRange(
      atPos + user.length,
      atPos + user.length
    );
    textAreaRef.current?.focus();
    setAtPos();
    searchBoxRef.current?.setQuery(undefined);
  };

  const onChange = (e) => {
    // e.target.style.height = "auto";
    // e.target.style.height = `${e.target.scrollHeight}px`;
    autosize(e.target);
    setHeight(e.target.style.height);
  };

  const renderByMention = () => {
    const vText = value.valueOf();

    if (mentions.length == 0) {
      return (
        <span
          style={{
            whiteSpace: "pre-wrap",
          }}
        >
          {vText}
        </span>
      );
    } else {
      return mentions.map((m, index) => {
        return (
          <Fragment key={`${m.start}_${m.end}`}>
            {index == 0 && m.start > 0 && (
              <span
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {vText.slice(0, m.start)}
              </span>
            )}
            <span
              style={{
                whiteSpace: "pre-wrap",
                backgroundColor: "rgba(24, 119, 242, 0.2)",
              }}
            >
              {vText.slice(m.start, m.end + 1)}
            </span>
            {index < mentions.length - 1 && (
              <span
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {vText.slice(m.end + 1, mentions[index + 1].start)}
              </span>
            )}
            {index == mentions.length - 1 && m.end < vText.length - 1 && (
              <span
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {vText.slice(m.end + 1, vText.length)}
              </span>
            )}
          </Fragment>
        );
      });
    }
  };

  const onBlur = (e) => {
    if (e.relatedTarget?.id != "search-list") {
      searchBoxRef.current?.setQuery(undefined);
    }
  };

  return (
    <div style={{ marginTop: 16, marginLeft: 16 }}>
      <div style={{ position: "relative", backgroundColor: "#fff" }}>
        <textarea
          ref={textAreaRef}
          rows={1}
          style={{
            resize: "none",
            width: 200,
            backgroundColor: "white",
            fontSize: 14,
            padding: 2,
            border: "1px solid black",
            fontFamily: "sans-serif",
            color: "black",
            caretColor: "black",
          }}
          onClick={onClick}
          value={value.valueOf()}
          onKeyDown={onKeyDown}
          onInput={onInput}
          onChange={onChange}
          onKeyUp={onKeyUp}
          onBlur={onBlur}
        />
        <p
          style={{
            position: "absolute",
            fontFamily: "sans-serif",
            fontSize: 14,
            top: 0,
            width: 200,
            height,
            border: "1px solid red",
            backgroundColor: "transparent",
            zIndex: 1,
            pointerEvents: "none",
            padding: 2,
            margin: 0,
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {renderByMention()}
        </p>
      </div>
      <SearchBox ref={searchBoxRef} onMention={onMention} />
    </div>
  );
}

export default App;
