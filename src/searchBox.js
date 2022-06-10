import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

// Hook
function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );
  return debouncedValue;
}

const _searchBox = (props, ref) => {
  const [query, setQuery] = useState();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [top, setTop] = useState(0);

  const _debouncedQuery = useDebounce(query, 1000);

  const _fetchData = (q) => {
    fetch(
      `https://620de95120ac3a4eedcd0e23.mockapi.io/users${
        q ? `?name=${q}` : ""
      }`
    )
      .then((r) => r.json())
      .then((j) => {
        setLoading(false);
        setData(j);
      })
      .catch((_) => {
        setLoading(false);
        setData([]);
      });
  };

  useEffect(() => {
    setLoading(true);
    setData([]);
    _fetchData(_debouncedQuery);
  }, [_debouncedQuery]);

  useImperativeHandle(ref, () => {
    return {
      setQuery,
      setYPos: setTop,
    };
  });

  const _list = data.map((dt) => {
    const onClick = (e) => props.onMention?.(dt.name);
    return (
      <div
        id={`select_name_${dt.id}`}
        style={{
          padding: 8,
          cursor: "pointer",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        onClick={onClick}
      >
        {dt.name}
      </div>
    );
  });

  const renderByState = () => {
    if (loading) {
      return <div style={{ padding: 8 }}>Loading...</div>;
    } else {
      return data.length ? _list : <div style={{ padding: 8 }}>No data...</div>;
    }
  };

  return (
    typeof query == "string" && (
      <div
        tabIndex={0}
        id="search-list"
        style={{
          border: "1px solid black",
          marginTop: -8,
          marginLeft: 8,
          marginRight: 8,
          maxHeight: 300,
          width: 300,
          overflow: "auto",
          position: "absolute",
          backgroundColor: "#fff",
          top,
        }}
      >
        {renderByState()}
      </div>
    )
  );
};

const SearchBox = forwardRef(_searchBox);

export default SearchBox;
