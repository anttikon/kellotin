import fs = require("fs");
import path = require("path");
import csv = require("fast-csv");

const dir = `${__dirname}/../`;
const findFile = () =>
  fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".csv"))
    .reduce<string | undefined>(
      (acc, file) =>
        !acc ||
        fs.statSync(dir + file).birthtimeMs > fs.statSync(dir + acc).birthtimeMs
          ? file
          : acc,
      undefined
    );

const parseCsv = (): Promise<CsvData[]> =>
  new Promise((resolve, reject) => {
    let data: CsvData[] = [];

    const file = findFile();

    if (!file) {
      return reject("Cannot find csv!");
    }

    fs.createReadStream(path.resolve(dir, file))
      .pipe(csv.parse({ headers: true }))
      .on("error", (error: Error) => reject(error))
      .on("data", (row: CsvData) => data.push(row))
      .on("end", () => resolve(data));
  });

const uniq = (array: string[]) =>
  array.filter((row, index) => array.indexOf(row) === index);

const sum = (array: number[]) =>
  array.reduce((acc, element) => acc + element, 0);

const getDays = (data: CsvData[]) => uniq(data.map((d) => d.Date));

const getHours = (data: CsvData[], date: string) =>
  sum(
    data
      .filter((row) => row.Date === date)
      .map((row) => parseFloat(row.Hours.replace(/,/g, ".")))
  );

const getHoursByDate = (data: CsvData[]): any =>
  getDays(data).reduce<HoursByDate[]>(
    (acc, date) => [...acc, { date, hours: getHours(data, date) }],
    []
  );

const getDay = (date: string) => parseInt(date.split("-")[2]);

const getLanguage = (argv: string[]): "fi" | "en" => {
  if (argv.length !== 4) {
    throw new Error("Wrong argument length");
  }
  const language = argv[3];
  if (language === "fi" || language === "en") {
    return language;
  }
  throw new Error("Incorrect language argument!");
};

const getHoursByDateInLanguage = (
  hoursByDate: HoursByDate,
  language: "fi" | "en"
) => {
  if (language === "fi") {
    return hoursByDate.hours.toString().replace(/\./g, ",");
  } else {
    return hoursByDate.hours.toString();
  }
};

const getScript = (hoursByDates: HoursByDate[]) =>
  hoursByDates
    .reduce<string[]>((acc, hoursByDate) => {
      return [
        ...acc,
        `document.getElementsByClassName('day-${getDay(
          hoursByDate.date
        )}')[0].value = "${getHoursByDateInLanguage(
          hoursByDate,
          getLanguage(process.argv)
        )}"`,
      ];
    }, [])
    .join(";");

const getClient = (argv: string[]) => {
  if (argv.length !== 4) {
    throw new Error("Wrong argument length");
  }
  return argv[2];
};

const app = async () => {
  const client = getClient(process.argv);
  console.log("✨ Client:", client, "\n");

  const data = await parseCsv();
  const clientData = data.filter(
    (row) => row.Client.toLowerCase() === client.toLowerCase()
  );
  const hoursByDates = getHoursByDate(clientData);

  return getScript(hoursByDates);
};

app()
  .then((result) => console.log(result))
  .catch((e) => console.error(e));
