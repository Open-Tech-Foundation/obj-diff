import ReportIcon from "@mui/icons-material/Report";
import { Alert, Box, Typography } from "@mui/joy";
import { DiffResult } from "@opentf/obj-diff";
import { isArr, isEql, isObj, set } from "@opentf/std";
import ShortUniqueId from "short-unique-id";
import safeEval from "./safeEval";

const { randomUUID } = new ShortUniqueId({ length: 10 });

const YELLOW = "#FFDC00";
const BG_YELLOW = "#4d4200";
const RED = "#FF4136";
const GREEN = "#2ECC40";
const BLACK = "#111111";

type Props = {
  obj: string;
  diff: Array<DiffResult>;
};

function combine(o: unknown, diff: Array<DiffResult>) {
  try {
    if (isObj(o) || isArr(o)) {
      for (const patch of diff) {
        if (patch.t === 1 || patch.t === 2) {
          o = set(o, patch.p, patch.v);
        }
      }
    }

    return o;
  } catch (error) {
    return;
  }
}

function contains(arr, subArr) {
  for (let i = 0; i < subArr.length; i++) {
    if (!Object.is(subArr[i], arr[i])) {
      return false;
    }
  }

  return true;
}

function Row({
  children,
  path,
  diff,
}: {
  path: Array<number | string>;
  diff: Array<DiffResult>;
}) {
  let diffRes = diff.find((d) => isEql(d.p, path));

  if (!diffRes) {
    diffRes = diff.find((d) => contains(path, d.p));
  }

  let color = "white";
  let bgColor = "inherit";
  let sym = "";

  if (diffRes) {
    switch (diffRes.t) {
      case 0:
        color = RED;
        bgColor = "#5d0500";
        sym = "-";
        break;
      case 1:
        color = GREEN;
        bgColor = "#0e3d13";
        sym = "+";
        break;
      case 2:
        color = YELLOW;
        bgColor = BG_YELLOW;
        break;
    }
  }

  return (
    <Box sx={{ color, backgroundColor: bgColor }}>
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
      <Row key={randomUUID()} path={path} diff={diff}>
        {k && <Box sx={{ display: "inline" }}>{k}:</Box>}
        <Box sx={{ display: "inline", ml: k ? 2 : 0 }}>{"{"}</Box>
      </Row>
    );
    for (const [key, val] of Object.entries(o)) {
      rows.push(...getRows(key, val, [...path, key], diff));
    }
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        {"}"}
      </Row>
    );
  }

  if (isArr(o)) {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        {k && <Box sx={{ display: "inline" }}>{k}:</Box>}
        <Box sx={{ display: "inline", ml: k ? 2 : 0 }}>{"["}</Box>
      </Row>
    );

    o.forEach((val, idx) => {
      rows.push(...getRows(idx, val, [...path, idx], diff));
    });

    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        {"]"}
      </Row>
    );
  }

  if (typeof o === "string") {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{`"${o}"`}</Box>,
      </Row>
    );
  }

  if (typeof o === "number") {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{o}</Box>,
      </Row>
    );
  }

  if (typeof o === "bigint") {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{o.toString()}n</Box>,
      </Row>
    );
  }

  if (o === null) {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>null</Box>,
      </Row>
    );
  }

  if (o === undefined) {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>undefined</Box>,
      </Row>
    );
  }

  if (typeof o === "boolean") {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>
          {o === true ? "true" : "false"}
        </Box>
        ,
      </Row>
    );
  }

  if (o instanceof Date) {
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{o.toString()}</Box>,
      </Row>
    );
  }

  if (o instanceof Map) {
    const arr = Array.from(o);
    const str = `Map(${o.size}) ${JSON.stringify(arr, null, 2)}`;
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{str}</Box>,
      </Row>
    );
  }

  if (o instanceof Set) {
    const arr = Array.from(o);
    const str = `Set(${o.size}) ${JSON.stringify(arr, null, 2)}`;
    rows.push(
      <Row key={randomUUID()} path={path} diff={diff}>
        <Box sx={{ display: "inline" }}>{k}:</Box>
        <Box sx={{ display: "inline", ml: 2 }}>{str}</Box>,
      </Row>
    );
  }

  return rows;
}

export default function Visualizer({ obj, diff, err }: Props) {
  let o;
  let rows = [];
  let finalObj;

  if (err) {
    return (
      <Box sx={{ backgroundColor: BLACK, p: 2, minHeight: "100%" }}>
        <Alert
          sx={{ alignItems: "flex-start" }}
          startDecorator={<ReportIcon />}
          variant="soft"
          color="danger"
          size="sm"
        >
          <div>
            <div>{err.name}</div>
            <Typography level="body-sm" color="danger">
              {err.message}
            </Typography>
          </div>
        </Alert>
      </Box>
    );
  }

  try {
    o = safeEval(obj);
    finalObj = combine(o, diff);
  } catch (error) {}

  if (finalObj) {
    rows = getRows("", finalObj, [], diff);
  }

  return (
    <Box sx={{ backgroundColor: BLACK, p: 2, minHeight: "100%" }}>{rows}</Box>
  );
}
