/**
 * Question Loader — fetches JSON question sets, merges, shuffles, slices.
 *
 * To add a new question set:
 *   1. Create a JSON file in data/ following the schema
 *   2. Add an entry to the QUESTION_SETS array below
 *   3. It will automatically appear on the setup screen
 */

const QUESTION_SETS = [
  {
    id: 'set1-architecture',
    file: 'data/set1-architecture.json',
    name: 'Snowflake Architecture & Features',
    domain: 'Snowflake AI Data Cloud Features & Architecture',
    domainWeight: 25
  },
  {
    id: 'set2-security',
    file: 'data/set2-security.json',
    name: 'Account Access & Security',
    domain: 'Account Access and Security',
    domainWeight: 20
  },
  {
    id: 'set3-performance',
    file: 'data/set3-performance.json',
    name: 'Performance Concepts',
    domain: 'Performance Concepts',
    domainWeight: 15
  },
  {
    id: 'set4-data-loading',
    file: 'data/set4-data-loading.json',
    name: 'Data Loading & Unloading',
    domain: 'Data Loading and Unloading',
    domainWeight: 10
  },
  {
    id: 'set5-transformations',
    file: 'data/set5-transformations.json',
    name: 'Data Transformations',
    domain: 'Data Transformations',
    domainWeight: 20
  },
  {
    id: 'set6-data-protection',
    file: 'data/set6-data-protection.json',
    name: 'Data Protection & Sharing',
    domain: 'Data Protection and Data Sharing',
    domainWeight: 10
  },
  {
    id: 'set7-practice-exam',
    file: 'data/set7-practice-exam.json',
    name: '&#10052 SnowPro Core Practice Exam by Cristian Scutaru',
    domain: '&#10052 SnowPro Core Certification Practice Questions by Cristian Scutaru',
    domainWeight: 0
  }
];

/**
 * Load question sets by their IDs.
 * @param {string[]} setIds — array of set IDs to load
 * @returns {Promise<{questions: Array, setsMeta: Array}>}
 */
async function loadQuestionSets(setIds) {
  const setsToLoad = QUESTION_SETS.filter(s => setIds.includes(s.id));
  const results = await Promise.all(
    setsToLoad.map(async (setInfo) => {
      const resp = await fetch(setInfo.file);
      if (!resp.ok) throw new Error(`Failed to load ${setInfo.file}: ${resp.status}`);
      const data = await resp.json();
      // Tag each question with domain info
      return data.questions.map(q => ({
        ...q,
        domain: setInfo.domain,
        domainShort: setInfo.name,
        setId: setInfo.id
      }));
    })
  );

  const allQuestions = results.flat();
  return {
    questions: allQuestions,
    setsMeta: setsToLoad
  };
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Prepare quiz questions: load selected sets, optionally shuffle, slice to count.
 * When shuffle is off and count is limited, select pro-rata from each domain by domainWeight.
 */
async function prepareQuestions(setIds, count, shuffle) {
  const { questions, setsMeta } = await loadQuestionSets(setIds);

  if (shuffle) {
    let prepared = [...questions];
    shuffleArray(prepared);
    if (count !== 'all' && count < prepared.length) {
      prepared = prepared.slice(0, count);
    }
    return { questions: prepared, setsMeta, totalAvailable: questions.length };
  }

  // No shuffle — select pro-rata by domainWeight
  const total = count === 'all' ? questions.length : Math.min(count, questions.length);

  if (total >= questions.length) {
    return { questions: [...questions], setsMeta, totalAvailable: questions.length };
  }

  // Group questions by setId
  const bySet = {};
  for (const q of questions) {
    if (!bySet[q.setId]) bySet[q.setId] = [];
    bySet[q.setId].push(q);
  }

  // Calculate weight sum for selected sets
  const selectedSets = setsMeta.filter(s => bySet[s.id]);
  const weightSum = selectedSets.reduce((sum, s) => sum + s.domainWeight, 0);

  // Distribute count proportionally, then distribute remainders by largest fraction
  let allocated = {};
  let remainders = [];
  let allocatedTotal = 0;

  for (const s of selectedSets) {
    const exact = (s.domainWeight / weightSum) * total;
    const base = Math.floor(exact);
    const available = bySet[s.id].length;
    const capped = Math.min(base, available);
    allocated[s.id] = capped;
    allocatedTotal += capped;
    remainders.push({ id: s.id, frac: exact - base, available });
  }

  // Distribute remaining slots by largest fractional part
  remainders.sort((a, b) => b.frac - a.frac);
  let remaining = total - allocatedTotal;
  for (const r of remainders) {
    if (remaining <= 0) break;
    if (allocated[r.id] < r.available) {
      allocated[r.id]++;
      remaining--;
    }
  }

  // Pick allocated count from each set (in original order)
  let prepared = [];
  for (const s of selectedSets) {
    prepared.push(...bySet[s.id].slice(0, allocated[s.id]));
  }

  return { questions: prepared, setsMeta, totalAvailable: questions.length };
}
