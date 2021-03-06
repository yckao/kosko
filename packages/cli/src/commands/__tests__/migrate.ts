import { migrateString } from "@kosko/migrate";
import fs from "fs";
import getStdin from "get-stdin";
import { join } from "path";
import { Signale } from "signale";
import { promisify } from "util";
import { setLogger } from "../../cli/command";
import { print } from "../../cli/print";
import { MigrateArguments, migrateCmd } from "../migrate";

jest.mock("get-stdin");
jest.mock("../../cli/print");

const readDir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const fixturePath = join(__dirname, "..", "__fixtures__");
const logger = new Signale({ disabled: true });

async function execute(args: Partial<MigrateArguments>): Promise<void> {
  const ctx = setLogger({ cwd: fixturePath, ...args } as any, logger);
  await migrateCmd.handler(ctx);
}

beforeEach(() => jest.resetAllMocks());

describe(`given "-"`, () => {
  const input = `
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers: []
  `;

  beforeEach(async () => {
    ((getStdin as any) as jest.Mock).mockResolvedValueOnce(input);
    await execute({ filename: ["-"] });
  });

  test("should call print once", () => {
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("should call print with result", async () => {
    const expected = migrateString(input);
    expect(print).toHaveBeenCalledWith(expected);
  });
});

describe("given a file", () => {
  beforeEach(async () => {
    await execute({ filename: ["only-deployment.yaml"] });
  });

  test("should call print once", () => {
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("should call print with result", async () => {
    const expected = migrateString(
      await readFile(join(fixturePath, "only-deployment.yaml"), "utf8")
    );

    expect(print).toHaveBeenCalledWith(expected);
  });
});

describe("given an absolute path", () => {
  const path = join(fixturePath, "only-deployment.yaml");

  beforeEach(async () => {
    await execute({ filename: [path] });
  });

  test("should call print once", () => {
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("should call print with result", async () => {
    const expected = migrateString(await readFile(path, "utf8"));
    expect(print).toHaveBeenCalledWith(expected);
  });
});

describe("given a directory", () => {
  beforeEach(async () => {
    await execute({ filename: [fixturePath] });
  });

  test("should call print once", () => {
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("should call print with result", async () => {
    const files = await readDir(fixturePath);
    const contents = await Promise.all(
      files.map(file => readFile(join(fixturePath, file), "utf8"))
    );
    const expected = migrateString(contents.join("---\n"));
    expect(print).toHaveBeenCalledWith(expected);
  });
});

describe("given multiple files", () => {
  beforeEach(async () => {
    await execute({
      filename: ["only-deployment.yaml", "deployment-and-service.yaml"]
    });
  });

  test("should call print once", () => {
    expect(print).toHaveBeenCalledTimes(1);
  });

  test("should call print with result", async () => {
    const contents = await Promise.all(
      ["only-deployment.yaml", "deployment-and-service.yaml"].map(file =>
        readFile(join(fixturePath, file), "utf8")
      )
    );
    const expected = migrateString("---\n" + contents.join("\n"));

    expect(print).toHaveBeenCalledWith(expected);
  });
});
