import { Box } from "@mui/joy";
import { DiffResult } from "@opentf/obj-diff";
import { isArr, isEql, isObj, isStr, set } from "@opentf/std";
import { ReactElement } from "react";

const YELLOW = "#FFDC00";
const RED = "#FF4136";
const GREEN = "#2ECC40";
const BLACK = "#111111";

function PlainObject({ k, o, diff, path }) {
  return (
    <>
      <Box sx={{ color: "white", display: "inline" }}>{"{"}</Box>
      {Object.keys(o).map((objK, i) => {
        return (
          <Row path={[...path, objK]} diff={diff} key={i}>
            {objK}:{" "}
            <Obj path={[...path, objK]} k={objK} o={o[objK]} diff={diff} />
          </Row>
        );
      })}
      <Box sx={{ color: "white" }}>{"}"}</Box>
    </>
  );
}

function Array({ o, diff, path }) {
  return (
    <Box>
      <Box sx={{ color: "white" }}>{"["}</Box>
      {o.map((e, i) => (
        <Row key={i} diff={diff} path={[...path, i]}>
          <Obj k={i} o={e} path={[...path, i]} diff={diff} />
        </Row>
      ))}
      <Box sx={{ color: "white" }}>{"]"}</Box>
    </Box>
  );
}

function Obj({ k, o, path = [], diff }) {
  if (isArr(o)) {
    return <Array o={o} diff={diff} path={path} />;
  }

  if (isObj(o)) {
    return (
      <>
        {/* <Box sx={{ color: "white" }}>{k ? `${k}:  {` : "{"}</Box> */}
        <PlainObject k={k} o={o} diff={diff} path={path} />
        {/* <Box sx={{ color: "white" }}>{"}"}</Box> */}
      </>
    );
  }

  if (isStr(o)) {
    return <Box sx={{ display: "inline-block" }}>{`"${o}"`}</Box>;
  }

  return <Box sx={{ display: "inline-block" }}>{o === null ? "null" : o}</Box>;
}

type Props = {
  obj: string;
  diff: Array<DiffResult>;
};

function combine(o: unknown, diff: Array<DiffResult>) {
  if (isObj(o) || isArr(o)) {
    for (const patch of diff) {
      if (patch.t === 1 || patch.t === 2) {
        o = set(o, patch.p, patch.v);
      }
    }
  }

  return o;
}

function Row({ children, path, diff }) {
  const diffRes = diff.find((d) => isEql(d.p, path));
  let color = "white";
  let sym = "";

  if (diffRes) {
    switch (diffRes.t) {
      case 0:
        color = RED;
        sym = "-";
        break;
      case 1:
        color = GREEN;
        sym = "+";
        break;
      case 2:
        color = YELLOW;
        break;
    }
  }

  return (
    <Box sx={{ color }}>
      <Box sx={{ display: "inline" }}>{sym}</Box>
      <Box
        sx={{
          display: "inline",
          pl: path.length * 2 - sym.length,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function getRows(k, o: unknown, path = [], diff) {
  const rows = [];

  if (isObj(o)) {
    rows.push(
      <Row path={path} diff={diff}>
        {k && <Box sx={{ display: "inline" }}>{k}:</Box>}
        <Box sx={{ display: "inline", ml: k ? 2 : 0 }}>{"{"}</Box>
      </Row>
    );
    for (const [key, val] of Object.entries(o)) {
      rows.push(...getRows(key, val, [...path, key], diff));
    }
    rows.push(
      <Row path={path} diff={diff}>
        {"}"}
      </Row>
    );
  }

  if (isArr(o)) {
    rows.push(
      <Row path={path} diff={diff}>
        {k && <Box sx={{ display: "inline" }}>{k}:</Box>}
        <Box sx={{ display: "inline", ml: k ? 2 : 0 }}>{"["}</Box>
      </Row>
    );

    o.forEach((val, idx) => {
      rows.push(...getRows(idx, val, [...path, idx], diff));
    });

    rows.push(
      <Row path={path} diff={diff}>
        {"]"}
      </Row>
    );
  }

  if (typeof o === "string") {
    rows.push(
      <Row path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{`"${o}"`}</Box>
      </Row>
    );
  }

  if (typeof o === "number") {
    rows.push(
      <Row path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{o}</Box>
      </Row>
    );
  }

  if (o === null) {
    rows.push(
      <Row path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>null</Box>
      </Row>
    );
  }

  return rows;
}

export default function Visualizer({ obj, diff }: Props) {
  let o;
  try {
    o = eval(`const a = ${obj}; a`);
  } catch (error) {}

  const finalObj = combine(o, diff);

  const rows: Array<ReactElement> = getRows("", finalObj, [], diff);

  return (
    <Box sx={{ backgroundColor: BLACK, p: 2, minHeight: "100%" }}>{rows}</Box>
  );
}
