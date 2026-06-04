import { QUESTIONS_PER_ROUND } from './game-utils'

interface FallbackQuestion {
  question: string
  correct_answer: string
  incorrect_answers: string[]
  difficulty: string
}

interface FallbackCategory {
  id: number
  name: string
  questions: FallbackQuestion[]
}

export const FALLBACK_CATEGORIES: FallbackCategory[] = [
  {
    id: 9001,
    name: 'General Knowledge',
    questions: [
      { question: 'What is the capital of France?', correct_answer: 'Paris', incorrect_answers: ['London', 'Berlin', 'Madrid'], difficulty: 'easy' },
      { question: 'How many sides does a hexagon have?', correct_answer: '6', incorrect_answers: ['5', '7', '8'], difficulty: 'easy' },
      { question: 'What is the chemical symbol for gold?', correct_answer: 'Au', incorrect_answers: ['Ag', 'Fe', 'Pb'], difficulty: 'easy' },
      { question: 'Which planet is known as the Red Planet?', correct_answer: 'Mars', incorrect_answers: ['Venus', 'Jupiter', 'Saturn'], difficulty: 'easy' },
      { question: 'Who painted the Mona Lisa?', correct_answer: 'Leonardo da Vinci', incorrect_answers: ['Michelangelo', 'Raphael', 'Botticelli'], difficulty: 'easy' },
      { question: 'What is the largest ocean on Earth?', correct_answer: 'Pacific Ocean', incorrect_answers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'], difficulty: 'easy' },
      { question: 'How many bones are in the adult human body?', correct_answer: '206', incorrect_answers: ['198', '213', '225'], difficulty: 'medium' },
      { question: 'What year did the Berlin Wall fall?', correct_answer: '1989', incorrect_answers: ['1987', '1991', '1985'], difficulty: 'medium' },
      { question: 'What is the speed of light in a vacuum (approx km/s)?', correct_answer: '299,792', incorrect_answers: ['150,000', '500,000', '186,000'], difficulty: 'medium' },
      { question: 'Which element has atomic number 1?', correct_answer: 'Hydrogen', incorrect_answers: ['Helium', 'Lithium', 'Carbon'], difficulty: 'easy' },
    ],
  },
  {
    id: 9002,
    name: 'Science & Technology',
    questions: [
      { question: 'What does CPU stand for?', correct_answer: 'Central Processing Unit', incorrect_answers: ['Computer Power Unit', 'Central Program Utility', 'Core Processing Unit'], difficulty: 'easy' },
      { question: 'What programming language was created by Guido van Rossum?', correct_answer: 'Python', incorrect_answers: ['Ruby', 'Perl', 'Java'], difficulty: 'easy' },
      { question: 'What is the boiling point of water at sea level (Celsius)?', correct_answer: '100', incorrect_answers: ['90', '110', '212'], difficulty: 'easy' },
      { question: 'Which company developed the Android operating system?', correct_answer: 'Google', incorrect_answers: ['Apple', 'Microsoft', 'Samsung'], difficulty: 'easy' },
      { question: 'What does DNA stand for?', correct_answer: 'Deoxyribonucleic Acid', incorrect_answers: ['Dynamic Nucleic Arrangement', 'Digital Nucleotide Array', 'Deoxyribose Nucleotide Acid'], difficulty: 'easy' },
      { question: 'In what year was the first iPhone released?', correct_answer: '2007', incorrect_answers: ['2005', '2008', '2010'], difficulty: 'easy' },
      { question: 'What is the hardest natural substance on Earth?', correct_answer: 'Diamond', incorrect_answers: ['Quartz', 'Titanium', 'Graphene'], difficulty: 'easy' },
      { question: 'How many bits are in a byte?', correct_answer: '8', incorrect_answers: ['4', '16', '32'], difficulty: 'easy' },
      { question: 'What is the powerhouse of the cell?', correct_answer: 'Mitochondria', incorrect_answers: ['Nucleus', 'Ribosome', 'Golgi apparatus'], difficulty: 'easy' },
      { question: 'What gas do plants absorb during photosynthesis?', correct_answer: 'Carbon dioxide', incorrect_answers: ['Oxygen', 'Nitrogen', 'Hydrogen'], difficulty: 'easy' },
    ],
  },
  {
    id: 9003,
    name: 'History',
    questions: [
      { question: 'In which year did World War II end?', correct_answer: '1945', incorrect_answers: ['1943', '1946', '1944'], difficulty: 'easy' },
      { question: 'Who was the first person to walk on the Moon?', correct_answer: 'Neil Armstrong', incorrect_answers: ['Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'], difficulty: 'easy' },
      { question: 'Which ancient wonder was located in Alexandria?', correct_answer: 'The Lighthouse of Alexandria', incorrect_answers: ['The Colossus of Rhodes', 'The Hanging Gardens', 'The Temple of Artemis'], difficulty: 'medium' },
      { question: 'Who was the first President of the United States?', correct_answer: 'George Washington', incorrect_answers: ['John Adams', 'Thomas Jefferson', 'Benjamin Franklin'], difficulty: 'easy' },
      { question: 'In which year did the Titanic sink?', correct_answer: '1912', incorrect_answers: ['1908', '1915', '1920'], difficulty: 'easy' },
      { question: 'What empire did Julius Caesar lead?', correct_answer: 'Roman Empire', incorrect_answers: ['Greek Empire', 'Ottoman Empire', 'Byzantine Empire'], difficulty: 'easy' },
      { question: 'Which country was the first to give women the right to vote nationally?', correct_answer: 'New Zealand', incorrect_answers: ['Australia', 'Finland', 'United States'], difficulty: 'hard' },
      { question: 'The French Revolution began in which year?', correct_answer: '1789', incorrect_answers: ['1776', '1804', '1815'], difficulty: 'medium' },
      { question: 'Who wrote "The Communist Manifesto"?', correct_answer: 'Karl Marx and Friedrich Engels', incorrect_answers: ['Vladimir Lenin', 'Leon Trotsky', 'Mao Zedong'], difficulty: 'medium' },
      { question: 'Which war was fought between North and South in America (1861-1865)?', correct_answer: 'The American Civil War', incorrect_answers: ['The War of Independence', 'The Mexican-American War', 'The Spanish-American War'], difficulty: 'easy' },
    ],
  },
  {
    id: 9004,
    name: 'Geography',
    questions: [
      { question: 'What is the longest river in the world?', correct_answer: 'The Nile', incorrect_answers: ['The Amazon', 'The Yangtze', 'The Mississippi'], difficulty: 'easy' },
      { question: 'Which country has the most natural lakes?', correct_answer: 'Canada', incorrect_answers: ['Russia', 'United States', 'Finland'], difficulty: 'medium' },
      { question: 'What is the capital of Australia?', correct_answer: 'Canberra', incorrect_answers: ['Sydney', 'Melbourne', 'Brisbane'], difficulty: 'easy' },
      { question: 'Which is the smallest country in the world by area?', correct_answer: 'Vatican City', incorrect_answers: ['Monaco', 'San Marino', 'Liechtenstein'], difficulty: 'easy' },
      { question: 'On which continent is the Sahara Desert?', correct_answer: 'Africa', incorrect_answers: ['Asia', 'Australia', 'South America'], difficulty: 'easy' },
      { question: 'What is the tallest mountain in the world?', correct_answer: 'Mount Everest', incorrect_answers: ['K2', 'Kangchenjunga', 'Lhotse'], difficulty: 'easy' },
      { question: 'What is the capital of Canada?', correct_answer: 'Ottawa', incorrect_answers: ['Toronto', 'Vancouver', 'Montreal'], difficulty: 'easy' },
      { question: 'Which country shares the longest land border with Russia?', correct_answer: 'Kazakhstan', incorrect_answers: ['China', 'Ukraine', 'Mongolia'], difficulty: 'hard' },
      { question: 'The Great Barrier Reef is located off the coast of which country?', correct_answer: 'Australia', incorrect_answers: ['New Zealand', 'Fiji', 'Indonesia'], difficulty: 'easy' },
      { question: 'What is the capital of Brazil?', correct_answer: 'Brasilia', incorrect_answers: ['Sao Paulo', 'Rio de Janeiro', 'Salvador'], difficulty: 'easy' },
    ],
  },
  {
    id: 9005,
    name: 'Entertainment',
    questions: [
      { question: 'Which band performed "Bohemian Rhapsody"?', correct_answer: 'Queen', incorrect_answers: ['The Beatles', 'Led Zeppelin', 'Pink Floyd'], difficulty: 'easy' },
      { question: "In Harry Potter, what is the name of Harry's owl?", correct_answer: 'Hedwig', incorrect_answers: ['Errol', 'Pigwidgeon', 'Hermes'], difficulty: 'easy' },
      { question: 'Who directed the film "Jurassic Park" (1993)?', correct_answer: 'Steven Spielberg', incorrect_answers: ['James Cameron', 'George Lucas', 'Peter Jackson'], difficulty: 'easy' },
      { question: 'Which TV show features the fictional town of Hawkins, Indiana?', correct_answer: 'Stranger Things', incorrect_answers: ['Twin Peaks', 'Dark', 'The OA'], difficulty: 'easy' },
      { question: 'Who sang "Rolling in the Deep"?', correct_answer: 'Adele', incorrect_answers: ['Beyonce', 'Amy Winehouse', 'Rihanna'], difficulty: 'easy' },
      { question: 'What is the highest-grossing film of all time (unadjusted for inflation)?', correct_answer: 'Avatar', incorrect_answers: ['Avengers: Endgame', 'Titanic', 'Star Wars: The Force Awakens'], difficulty: 'medium' },
      { question: 'Who wrote the novel "1984"?', correct_answer: 'George Orwell', incorrect_answers: ['Aldous Huxley', 'Ray Bradbury', 'Philip K. Dick'], difficulty: 'easy' },
      { question: 'Which video game franchise features Master Chief?', correct_answer: 'Halo', incorrect_answers: ['Call of Duty', 'Gears of War', 'Destiny'], difficulty: 'easy' },
      { question: 'What colour is the Facebook "Like" button?', correct_answer: 'Blue', incorrect_answers: ['Red', 'White', 'Grey'], difficulty: 'easy' },
      { question: 'In which city is the TV show "Friends" set?', correct_answer: 'New York City', incorrect_answers: ['Los Angeles', 'Chicago', 'Boston'], difficulty: 'easy' },
    ],
  },
]

/**
 * Returns up to `count` fallback categories not already in `excludedIds`.
 * Each returned category is guaranteed to have exactly QUESTIONS_PER_ROUND questions.
 */
export function getFallbackRounds(
  count: number,
  excludedIds: Set<number>
): Array<{ category: { id: number; name: string }; questions: FallbackQuestion[] }> {
  return FALLBACK_CATEGORIES
    .filter((c) => !excludedIds.has(c.id) && c.questions.length >= QUESTIONS_PER_ROUND)
    .slice(0, count)
    .map((c) => ({
      category: { id: c.id, name: c.name },
      questions: c.questions.slice(0, QUESTIONS_PER_ROUND),
    }))
}
