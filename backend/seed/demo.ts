import path from "node:path";
import crypto from "node:crypto";
import { getReportsCollection } from "../db.ts";
import { deleteImages, putImage } from "../storage.ts";
import type { ReportDoc, ReportStatus } from "../types.ts";

// Fictional reports with licensed example photographs from other places.

interface DemoReport {
  photo: string;
  afterPhotos?: string[];
  title: string;
  desc: string;
  category: string;
  severity: number;
  lat: number;
  lng: number;
  status: ReportStatus;
  daysAgo: number;
  upvotes: number;
  ai: { summary: string; evidence: string[]; actions: string[]; confidence: number };
}

const SAFE_RU = ["Не прикасайтесь к отходам и держитесь на расстоянии", "Подайте обращение в акимат через eOtinish"];
const SAFE_KK = ["Қалдықтарға қол тигізбеңіз, қашық тұрыңыз", "eOtinish арқылы әкімдікке өтініш беріңіз"];

const REPORTS: DemoReport[] = [
  {
    photo: "road-dump",
    title: "Стихийная свалка у объездной дороги",
    desc: "Мешки с бытовым мусором и строительные отходы вдоль обочины. Куча растёт уже около месяца.",
    category: "illegal_dump", severity: 3, lat: 47.129, lng: 51.968, status: "open", daysAgo: 2, upvotes: 7,
    ai: { summary: "На фото видно крупное скопление бытовых и строительных отходов на обочине дороги.", evidence: ["мешки с мусором", "строительный мусор", "старая покрышка"], actions: SAFE_RU, confidence: 0.86 },
  },
  {
    photo: "burning-dump",
    title: "Возможное сжигание мусора на пустыре",
    desc: "Вечером почти каждый день идёт едкий дым, рядом жилые дома.",
    category: "waste_burning", severity: 4, lat: 47.088, lng: 51.956, status: "appeal_sent", daysAgo: 5, upvotes: 12,
    ai: { summary: "Видны открытое пламя и столб дыма над кучей отходов, что может указывать на сжигание мусора.", evidence: ["открытое пламя", "столб дыма", "отходы рядом"], actions: ["Держитесь подальше от дыма", "При угрозе распространения огня звоните 112", SAFE_RU[1]], confidence: 0.9 },
  },
  {
    photo: "oil-road",
    title: "Пятно нефтепродуктов на грунтовой дороге",
    desc: "Тёмное маслянистое пятно, резкий запах. Появилось после дождя.",
    category: "oil_spill", severity: 4, lat: 47.07, lng: 51.88, status: "answered", daysAgo: 12, upvotes: 9,
    ai: { summary: "На грунте видно крупное тёмное пятно с радужной плёнкой — возможное загрязнение нефтепродуктами.", evidence: ["тёмное пятно на грунте", "радужная плёнка"], actions: ["Не наступайте в пятно", SAFE_RU[1]], confidence: 0.78 },
  },
  {
    photo: "river-litter",
    title: "Пена и мусор у берега Урала",
    desc: "У берега скопилась жёлтая пена и пластиковый мусор.",
    category: "water_pollution", severity: 3, lat: 47.112, lng: 51.893, status: "open", daysAgo: 1, upvotes: 4,
    ai: { summary: "На воде у берега видны пятна пены и плавающий мусор — возможное загрязнение воды.", evidence: ["пена на воде", "плавающий пластик"], actions: ["Не купайтесь в этом месте", SAFE_RU[1]], confidence: 0.74 },
  },
  {
    photo: "chimney",
    title: "Густой тёмный дым из трубы на окраине",
    desc: "Дым идёт несколько часов подряд, ветер несёт его к жилым кварталам.",
    category: "air_emission", severity: 3, lat: 47.145, lng: 51.925, status: "open", daysAgo: 3, upvotes: 6,
    ai: { summary: "Из трубы выходит плотный тёмный дым. По одному фото нельзя судить о составе выбросов.", evidence: ["тёмный дым из трубы"], actions: ["Закройте окна, если дым идёт к вам", SAFE_RU[1]], confidence: 0.7 },
  },
  {
    photo: "fish",
    title: "Мёртвая рыба на берегу протоки",
    desc: "Около двадцати рыб на небольшом участке берега.",
    category: "dead_wildlife", severity: 4, lat: 47.061, lng: 51.902, status: "appeal_sent", daysAgo: 4, upvotes: 15,
    ai: { summary: "На берегу видны несколько мёртвых рыб. Причина по фото не определяется.", evidence: ["мёртвая рыба на песке"], actions: ["Не трогайте рыбу и не давайте её животным", SAFE_RU[1]], confidence: 0.83 },
  },
  {
    photo: "stump",
    afterPhotos: ["tree-after-1", "tree-after-2", "tree-after-3"],
    title: "Спиленные деревья во дворе",
    desc: "Спилили три здоровых дерева, пни остались.",
    category: "tree_damage", severity: 2, lat: 47.1, lng: 51.93, status: "resolved", daysAgo: 20, upvotes: 5,
    ai: { summary: "Видны свежие пни и поваленный ствол.", evidence: ["свежие пни", "поваленный ствол"], actions: [SAFE_RU[1]], confidence: 0.8 },
  },
  {
    photo: "full-bin",
    afterPhotos: ["stop-after-1", "stop-after-2", "stop-after-3"],
    title: "Мусор у остановки",
    desc: "Урна переполнена, мусор разносит ветром.",
    category: "illegal_dump", severity: 2, lat: 47.117, lng: 51.942, status: "resolved", daysAgo: 15, upvotes: 3,
    ai: { summary: "Небольшое скопление мусора рядом с остановкой.", evidence: ["пакеты с мусором"], actions: SAFE_RU, confidence: 0.88 },
  },
  {
    photo: "bank-dump",
    title: "Өзен жағасындағы үлкен қоқыс үйіндісі",
    desc: "Жағада құрылыс және тұрмыстық қалдықтар үйіліп жатыр.",
    category: "illegal_dump", severity: 5, lat: 47.153, lng: 51.887, status: "open", daysAgo: 6, upvotes: 18,
    ai: { summary: "Өзен жағасында тұрмыстық және құрылыс қалдықтарының үлкен үйіндісі көрінеді.", evidence: ["қоқыс қаптары", "құрылыс қалдықтары"], actions: SAFE_KK, confidence: 0.85 },
  },
  {
    photo: "burning-trash",
    title: "Аула ішінде қоқыс өртеу",
    desc: "Кешке қоқыс өртейді, түтін терезеден кіреді.",
    category: "waste_burning", severity: 3, lat: 47.095, lng: 51.855, status: "open", daysAgo: 2, upvotes: 8,
    ai: { summary: "Қалдықтар үйіндісінің үстінде от пен түтін көрінеді — қоқыс өртеу болуы мүмкін.", evidence: ["ашық от", "түтін"], actions: ["Түтіннен алыс болыңыз", "Өрт қаупі болса, 112-ге қоңырау шалыңыз"], confidence: 0.82 },
  },
  {
    photo: "paint",
    title: "Разлив краски на тротуаре",
    desc: "Большое пятно краски, обходить негде.",
    category: "other", severity: 1, lat: 47.108, lng: 51.915, status: "open", daysAgo: 8, upvotes: 2,
    ai: { summary: "На тротуаре видно пятно разлитой жидкости, похожей на краску.", evidence: ["пятно на покрытии"], actions: [SAFE_RU[1]], confidence: 0.6 },
  },
  {
    photo: "drain",
    title: "Вода с неприятным запахом течёт по улице",
    desc: "Мутная вода течёт из-под забора в арык уже неделю.",
    category: "water_pollution", severity: 2, lat: 47.083, lng: 51.92, status: "answered", daysAgo: 9, upvotes: 6,
    ai: { summary: "Видна мутная вода, стекающая по поверхности — возможное загрязнение.", evidence: ["мутная вода", "поток по улице"], actions: ["Не контактируйте с водой", SAFE_RU[1]], confidence: 0.65 },
  },
];

const DAY = 86_400_000;

function savePhoto(photo: string, key = crypto.randomBytes(10).toString("hex")) {
  return putImage(path.join(import.meta.dirname, "photos", `${photo}.jpg`), `demo-photo-${key}.jpg`);
}

// Migrate only objects created by the former illustration seeder. The old key
// gives the replacement a stable name across interrupted or concurrent runs.
const illustrationKey = /(?:^|\/)demo-([a-f0-9]{20})\.jpg$/;

/** Replace existing demo pictures in place, preserving report IDs and resident activity. */
export async function refreshDemoPhotos(): Promise<number> {
  const collection = await getReportsCollection();
  const docs = collection.find({ demo: true, $or: [
    { imageUrl: illustrationKey }, { "confirmations.imageUrl": illustrationKey },
  ] });
  let changed = 0;
  for await (const doc of docs) {
    const example = REPORTS.find((r) => r.title === doc.title);
    if (!example) continue;
    const key = doc.imageUrl?.match(illustrationKey)?.[1];
    if (key && doc.imageUrls?.length === 1 && doc.imageUrls[0] === doc.imageUrl) {
      const url = await savePhoto(example.photo, key);
      const result = await collection.updateOne(
        { _id: doc._id, demo: true, imageUrl: doc.imageUrl, imageUrls: doc.imageUrls },
        { $set: { imageUrl: url, imageUrls: [url] } }
      );
      changed += result.modifiedCount;
    }
    for (const confirmation of doc.confirmations ?? []) {
      const client = /^demo-\d+-([123])$/.exec(confirmation.client);
      const oldKey = confirmation.imageUrl.match(illustrationKey)?.[1];
      const photo = client && example.afterPhotos?.[Number(client[1]) - 1];
      if (!photo || !oldKey) continue;
      const url = await savePhoto(photo, oldKey);
      const result = await collection.updateOne(
        { _id: doc._id, demo: true, confirmations: { $elemMatch: { client: confirmation.client, imageUrl: confirmation.imageUrl } } },
        { $set: { "confirmations.$.imageUrl": url } }
      );
      changed += result.modifiedCount;
    }
  }
  return changed;
}

/** History so the status steps show dates. */
function history(status: ReportStatus, created: Date) {
  const order: ReportStatus[] = ["appeal_sent", "answered", "resolved"];
  const upto = order.indexOf(status);
  return order.slice(0, upto + 1).map((s, i) => ({ status: s, at: new Date(created.getTime() + (i + 1) * 2 * DAY) }));
}

/** Remove all demo reports (and their images). Returns how many were removed. */
export async function removeDemo(): Promise<number> {
  const collection = await getReportsCollection();
  const docs = await collection.find({ demo: true }).toArray();
  await deleteImages(docs.flatMap((d) => [d.imageUrl, ...d.imageUrls, ...(d.confirmations ?? []).map((c) => c.imageUrl)]));
  const { deletedCount } = await collection.deleteMany({ demo: true });
  return deletedCount;
}

/** Insert demo reports unless they already exist (or after removing them when reset = true). */
export async function seedDemo({ reset = false } = {}): Promise<number> {
  const collection = await getReportsCollection();
  if (reset) await removeDemo();
  else if (await collection.countDocuments({ demo: true })) return 0;

  const now = Date.now();
  const docs: ReportDoc[] = [];
  for (const [i, r] of REPORTS.entries()) {
    const created = new Date(now - r.daysAgo * DAY - i * 3_600_000);
    const image = await savePhoto(r.photo);
    const resolved = r.status === "resolved";
    const confirmations = await Promise.all(
      (r.afterPhotos ?? []).map(async (photo, index) => ({
        client: `demo-${i}-${index + 1}`,
        imageUrl: await savePhoto(photo),
        at: new Date(created.getTime() + (7 + index) * DAY),
      }))
    );
    docs.push({
      title: r.title,
      desc: r.desc,
      category: r.category,
      severity: r.severity,
      lat: r.lat,
      lng: r.lng,
      imageUrl: image,
      imageUrls: [image],
      status: r.status,
      upvotes: r.upvotes,
      createdAt: created,
      statusHistory: history(r.status, created),
      confirmations,
      ...(resolved ? { resolvedAt: confirmations[2].at } : {}),
      ai: {
        summary: r.ai.summary,
        visible_evidence: r.ai.evidence,
        suggested_actions: r.ai.actions,
        confidence: r.ai.confidence,
        category: r.category,
        severity: r.severity,
        model: "demo",
        edited: false,
      },
      demo: true,
    });
  }
  await collection.insertMany(docs);
  return docs.length;
}
