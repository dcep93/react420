import { useState } from "react";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { printF } from "../../Catalog";
import data_raw from "./data.json";
import getData, { DataType } from "./getData";

const data: DataType[] = data_raw;

export default function Employees() {
  const slackURL = "https://app.slack.com/client/T024H38KR/C3G14QKPS";

  const [months, updateMonths] = useState(24);
  const [percentile, updatePercentile] = useState(0.5);
  const tab: number[] = [];
  var num_started = 0;
  var num_ended = 0;

  const metrics: {
    key: string;
    f: (t: number) => number;
    g: () => any;
  }[] = [
    {
      key: "num_employees",
      f: (t) => data.filter((d) => d.start <= t && d.end >= t).length,
      g: () => null,
    },
    {
      key: "num_started_this_month",
      f: (t) =>
        data.filter((d) => Math.abs(d.start - t) <= 30 * 24 * 60 * 60).length,
      g: () => null,
    },
    {
      key: "num_ended_this_month",
      f: (t) =>
        data.filter((d) => Math.abs(d.end - t) <= 30 * 24 * 60 * 60).length,
      g: () => null,
    },
    {
      key: "percent_here_in_months",
      f: (t) =>
        ((future) =>
          future > Date.now() / 1000
            ? 0
            : tab.filter((index) => data[index].end >= future).length /
              tab.length)(t + (months * 60 * 60 * 24 * 365) / 12),
      g: () => (
        <span>
          <input
            type={"range"}
            defaultValue={months}
            min={6}
            max={60}
            onChange={(e) => updateMonths(parseInt(e.target.value))}
          />{" "}
          {months}
        </span>
      ),
    },
    {
      key: "percentile_tenure",
      f: (t) =>
        (t -
          data[tab[Math.floor((tab.length - 1) * (1 - percentile))]]?.start) /
        (60 * 60 * 24 * 365),
      g: () => (
        <span>
          <input
            type={"range"}
            defaultValue={percentile}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(e) => updatePercentile(parseFloat(e.target.value))}
          />{" "}
          {percentile}
        </span>
      ),
    },
  ];

  const sorted = data
    .flatMap((d, index) => [
      { t: d.start, index, is_start: true },
      { t: d.end, index, is_start: false },
    ])
    .filter((o) => o.t < Date.now() / 1000 - 60 * 60 * 24 * 60) // lots of recency noise
    .sort((a, b) => a.t - b.t);

  const mapped = clog(
    sorted.map((o) => {
      if (o.is_start) {
        num_started++;
        tab.push(o.index);
      } else {
        num_ended++;
        tab.splice(tab.indexOf(o.index), 1);
      }
      return {
        t: o.t,
        index: o.index,
        ...Object.fromEntries(metrics.map((m) => [m.key, m.f(o.t)])),
      };
    })
  );
  const [sortKey, updateSortKey] = useState("sortByStart");
  const [filterActive, updateFilterActive] = useState(false);
  const tableData = data.filter(
    (d) => !filterActive || Date.now() / 1000 - d.end < 60 * 60 * 24 * 90 // 90 days
  );
  return (
    <div>
      <div>
        {JSON.stringify(
          x.filter((a) => data.find((d) => d.username === a) === undefined)
        )}
      </div>
      <div>
        {
          x.filter((a) => data.find((d) => d.username === a) === undefined)
            .length
        }
      </div>
      <div>
        <a href={slackURL}>{slackURL}</a>
      </div>
      <div>
        <pre style={{ whiteSpace: "pre-wrap" }}>{printF(getData)}</pre>
      </div>
      <div>
        {data.length !== 0 && (
          <div>
            {metrics.map((m, i) => (
              <div key={i}>
                <h1>
                  <span>{m.key}</span>
                  <span>{m.g()}</span>
                </h1>
                <LineChart data={mapped} width={1400} height={300}>
                  <XAxis
                    dataKey={"t"}
                    type={"number"}
                    scale={"time"}
                    domain={[]}
                    tickFormatter={(tick) =>
                      new Date(tick * 1000).toLocaleDateString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(tick) =>
                      new Date(tick * 1000).toLocaleDateString()
                    }
                  />
                  <Line type="linear" dataKey={m.key} />
                </LineChart>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={filterActive}
              onChange={(e) => updateFilterActive(!filterActive)}
            />{" "}
            filter inactive 90 days
          </label>
        </div>
        <div>{tableData.length} entries</div>
        <div>
          {["sortByStart", "sortByEnd", "sortByTenure"].map((t, i) => (
            <div key={i}>
              <label>
                <input
                  type="radio"
                  checked={t === sortKey}
                  value={t}
                  onChange={(e) => updateSortKey(e.currentTarget.value)}
                />
                <span>{t}</span>
              </label>
            </div>
          ))}
        </div>
        <table>
          <tbody>
            {tableData
              .map((d) => ({
                d,
                s: {
                  sortByStart: d.start,
                  sortByEnd: -d.end,
                  sortByTenure: d.start - d.end,
                }[sortKey]!,
              }))
              .sort((a, b) => a.s - b.s)
              .map(({ d }) => d)
              .map((d, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{d.username || d.id}</td>
                  <td>{new Date(d.start * 1000).toDateString()}</td>
                  <td>{new Date(d.end * 1000).toDateString()}</td>
                  <td>
                    {((d.end - d.start) / (60 * 60 * 24 * 365)).toFixed(2)}{" "}
                    years
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function clog<T>(t: T): T {
  console.log(t);
  return t;
}

const x = [
  "aaron.gregory",
  "aaron.rodriguez",
  "aaron.weisberg",
  "abigail.katz",
  "adrienne.sum",
  "agustin.mulet",
  "ajay.gupta",
  "ajdin.burnic",
  "alan.becker",
  "alanna.hulburd",
  "alberto.astiazaran",
  "alberto.palacios",
  "alex.cantor",
  "alex.rossillo",
  "alex.vozniuk",
  "alex.yu",
  "alexa.saccone",
  "alexandra.orellana",
  "allie.gabbardmeller",
  "allison.clark",
  "alvaro.ortiz-vazquez",
  "alyssa.hopkins",
  "amanda",
  "amanda.benavidez",
  "amy",
  "ana.alagic",
  "ana.alvarezsuarez",
  "ana.pavkovic",
  "andrea.kang",
  "andrea.ocampo",
  "andrea.saunders",
  "andrea.zuparic",
  "andy.kor",
  "angel.florentin",
  "angel.davis",
  "anil.jakkam",
  "anish.shah",
  "anjumon.sahin",
  "annie.kuniansky",
  "annie.shieh",
  "antoine.mack",
  "araz.keshishian",
  "ariel.anariba",
  "arnchie.qu",
  "arthur.spektor",
  "arturo.nieto",
  "augusto.monteiro",
  "austin.bay",
  "austin.robarts",
  "ayana.frierson",
  "babbie.monahelis",
  "ben.cafuir",
  "ben.chin",
  "bharathwaj.jeganathan",
  "boris.sverdlik",
  "brad.winters",
  "brandon.liverence",
  "brandon.wu",
  "brendon.li",
  "brian.walsh",
  "bryan.gilmore",
  "bryan.jennings",
  "bryan",
  "butcher.lamour",
  "caitlin.lindstrom",
  "camille.ampey",
  "carlo.paz",
  "carolina.serrano",
  "caroline",
  "caroline.walthall",
  "cecilia.canteros",
  "cedric.laurant",
  "cedric.opina",
  "charlie.kleiner",
  "cheng.dai",
  "chloe.walecki",
  "chris.eldredge",
  "chris.opperwall",
  "christian.dorian",
  "christina.zabalza",
  "christy.zaragoza",
  "ci-yu.yan",
  "colin.holmes",
  "colleen.kennedy",
  "consuelo.mendez",
  "cooper.benson",
  "craig.yee",
  "crystal.braswell",
  "dacks.milliken",
  "damir.agacevic",
  "dan",
  "dan.wong",
  "dana.chien",
  "dani.laurent",
  "daniel.bastos",
  "danijel.nedimovic",
  "danny.mickleburgh",
  "darlene.dang",
  "dave.hamilton",
  "dave.pond",
  "david.knoppers",
  "david.oh",
  "dennis.lopez",
  "derek.zhu",
  "derrick.bonafilia",
  "desiree.jallow",
  "desiree.stephens",
  "deveyn.hainey",
  "dhvani.shah",
  "dino.kekic",
  "douglas.fornaro",
  "dunyeng.huh",
  "dustin.chaveleh",
  "eliza.khuner",
  "elize.delabrida",
  "elliot.mawby",
  "emanuel.andrada",
  "enrico.jante",
  "eric.tran",
  "erica.lei",
  "evelyn",
  "evelyn.quezada",
  "federico.caminiti",
  "felipe.fonseca",
  "gabriel.daraio",
  "geoff.topacio",
  "geoffrey.liu",
  "gicelle.malajacan",
  "gilles.bouvier",
  "seifeddine.gmati",
  "gokul.karthikeyan",
  "grouporders",
  "guilherme.franco",
  "guru.kuppuswamy",
  "hans.gallemit",
  "haritha.goluguri",
  "heidi.proske",
  "henry.la",
  "himani.narayan",
  "henrique.horbovyi",
  "ian.beckles",
  "igor.jurkovic",
  "igor.vasic",
  "ina.lalic",
  "irene.jan",
  "irene.rice",
  "isabella.scardapane",
  "ismail",
  "it-admin",
  "ithar.larbi",
  "jackie.wu",
  "jacob.weisheit",
  "jakerson.bermudo",
  "jason.caragan",
  "javier.rotelli",
  "jeff.james",
  "jeff.kolesky",
  "chayma.jemai",
  "jenna.bushspies",
  "jennifer.cao",
  "jessica.wells",
  "jessika.roesner",
  "jill.bucher",
  "jillian.kocis",
  "joao.goulart",
  "joel.wong",
  "john.diaz",
  "john.lawson",
  "john.lin",
  "john.robertson",
  "john.rohrbach",
  "jon.baetz",
  "jon.louis",
  "jordan.gooden",
  "jose.maglaque",
  "joseth.abello",
  "josh",
  "joshua.teravest",
  "josh.teravest",
  "josh.williams",
  "aleksandar.jovanovic",
  "juanjo.evangelista",
  "juliano.dotto",
  "julie.xie",
  "kamyar.dabiriasgari",
  "kara.hafez",
  "karoun",
  "kat.kragerud",
  "katelyn.stoll",
  "katherine.griffiths",
  "kathryn.lovell",
  "kayla.parker",
  "kea.decastro",
  "kelli.dragovich",
  "kelly.yu",
  "kenley.bradstreet",
  "kenzie.lane",
  "kerryck",
  "kevin.hu",
  "kevin.medrano",
  "kevin.moch",
  "kian.oladive",
  "kiley.mcevoy",
  "kimberly.chu",
  "kory.kolves",
  "kuldeep.singh",
  "kurt.beidler",
  "kyle.gerrity",
  "lauren.cruz",
  "lauren.mccombs",
  "lazar.dinic",
  "leif.blomquist",
  "leila.ybanez",
  "leo.basanez",
  "lidiomar.machado",
  "liliana.rojas",
  "lily.rudin",
  "lindsay.timmerman",
  "lisa.harden",
  "lizzie.arnett",
  "lowell.meyer",
  "lucas.tannus",
  "lucija.brtan",
  "luis.calona",
  "luis.paniagua",
  "luis.valenzuela",
  "luiz.cristofori",
  "lunider.elias",
  "madeline.gilbert",
  "madhu.goel",
  "madison.huber",
  "mahsa.houshmandi",
  "malcolm.collin",
  "mallory.obrien",
  "bruno.pinheiro",
  "manny.tarog",
  "marcella.wigg",
  "mariana.garcia",
  "marija.aladrovic",
  "marin.gunja",
  "mark.mueller",
  "marko.dimitrov",
  "marko.pavkovic",
  "marko.stokuca",
  "mason.leung",
  "matheus.vaccaro",
  "matias.mirabelli",
  "matija.hromin",
  "matija.misak",
  "matt.lavine",
  "matt.mcstravick",
  "matt.melgard",
  "matt.peterson",
  "matt.tenenbaum",
  "matthew.hellfeier",
  "max.harrington",
  "meagan.cooney",
  "megan.hughes",
  "megha.krishnamurthy",
  "meghann.lomas",
  "melissa.klein",
  "meredith.digiano",
  "michael.ellenburg",
  "michael.phares",
  "michel.lopes",
  "michelle.cheung",
  "michelle.min",
  "michelle.tran",
  "miguel.mercado",
  "mike.castro",
  "mike.suomi",
  "millie.khandpur",
  "mislav.abramovic",
  "mohamed.charfeddine",
  "morgan.steffy",
  "murali.kilari",
  "nat.carter",
  "nathan.miller",
  "nathalie.benrey",
  "nathan.thompson",
  "nathaniel.butler",
  "neto.chaves",
  "nick.brooks",
  "nika.bobnar",
  "niki.frankfort",
  "nilda.nejah",
  "nina.kwon",
  "niral.koradia",
  "noel.richelme",
  "noemi.lara",
  "nonsie.mtimkulu",
  "coco.pochiero",
  "okemdi.oparaeke",
  "olivia.caporizzo",
  "olivier.dorvelus",
  "omar.aleisa",
  "oscar.tejeda",
  "pablo.morra",
  "pablo.paniagua",
  "paresh.ravikumar",
  "patricio.pitaluga",
  "paul.heider",
  "paula.borja",
  "paula.illanes",
  "pawan.singh",
  "pete.mortensen",
  "petra.exnarova",
  "rakesh.jana",
  "raphael.barbo",
  "rari.raj",
  "ravi.vemuri",
  "rebecca.holt",
  "remya.ravindran",
  "renzo.baldovino",
  "ridwan.olawin",
  "rijwan.motlib",
  "riya.dashoriya",
  "rob.fazzalari",
  "robert.doidge",
  "robert.lis",
  "robin.tolochko",
  "rodrigo.cabral",
  "roger.goldfinger",
  "rolanjustin.cosico",
  "ronnie.quinonez",
  "rosalie.cruz",
  "ross.larner",
  "royce.cervantes",
  "ryan.cole",
  "salvatore.bertucci",
  "sam.odonnell",
  "sam.vanryssegem",
  "samantha.kim",
  "samet.ghirnikar",
  "samir.sahu",
  "samuel.azumah",
  "samuel.dahlberg",
  "sanford.banks",
  "sara.popken",
  "sarah.im",
  "sarah.schrijvers",
  "scott.czepiel",
  "scott.gursky",
  "scott.kamps-duac",
  "sean",
  "sean.white",
  "seanny.phoenix",
  "svc.procurement",
  "shane",
  "sharon.nie",
  "shaun",
  "shayan.sombolestani",
  "shelli.skinner",
  "shogo.tanaka",
  "shuaib.jewon",
  "skyler.kaufman",
  "slavica.nolevska",
  "sorin.chereji",
  "sowmya.subramanian",
  "sowmya.subramanian1",
  "stanley",
  "stephany.soto",
  "steve.carter",
  "steve.huynh",
  "steven.lumos",
  "steven.yeung",
  "susan.underwood",
  "takeshi.young",
  "ted.song",
  "teresa.chung",
  "teresa.yung",
  "theresa",
  "tia.lendor",
  "tiffany.serna",
  "tim.jones",
  "tim",
  "tin.zigic",
  "tingting.lin",
  "tom.lancaster",
  "tom.lehmann",
  "tom.ryan",
  "tomislav.bozovic",
  "tony.ventrice",
  "tuan.nguyen",
  "tyler.brown",
  "valentina.pavicic1",
  "valentina.pavicic",
  "vanessa.wheat",
  "venus.abalos",
  "veronica.cheung",
  "vickie",
  "victoria.bruni",
  "vincent.dandenault",
  "vish.ungapen",
  "vivian.killin",
  "voja.stamenkovic",
  "will.genovese",
  "william.alberton",
  "yanet.leon",
  "yogesh.mahanthu",
  "yongchao.zhao",
  "ysabelle.santiago",
  "yuliya.sas",
  "yuval.gnessin",
  "zack.chestler",
  "zak.killermann",
  "zilpah.beltran",
  "zira.cook",
  "zoran.kljajic",
];
