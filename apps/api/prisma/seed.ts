import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Upsert Category
  const category = await prisma.category.upsert({
    where: { slug: 'general-knowledge' },
    update: {},
    create: {
      name: 'General Knowledge',
      slug: 'general-knowledge',
    },
  })

  // 2. Find existing Exam or create one with required categoryId
  let exam = await prisma.exam.findFirst({
    where: { categoryId: category.id, slug: 'general-competitive-exam' },
  })

  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        name: 'General Competitive Exam',
        slug: 'general-competitive-exam',
        categoryId: category.id,
      },
    })
  }

  // 3. Upsert Subject (required for questions)
  const subject = await prisma.subject.upsert({
    where: { slug: 'general-science' },
    update: {},
    create: {
      name: 'General Science',
      slug: 'general-science',
    },
  })

  // 4. Create Quiz linked to Exam
  const uniqueSlug = `sample-gk-quiz-${Date.now()}`
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Sample General Knowledge Quiz',
      slug: uniqueSlug,
      examId: exam.id,
      status: 'PUBLISHED',
      questions: {
        create: [
          {
            position: 1,
            question: {
              create: {
                body: 'What is the capital of France?',
                subjectId: subject.id,
                difficulty: 1,
                marks: 1,
                options: {
                  create: [
                    { text: 'Paris', position: 1, isCorrect: true },
                    { text: 'London', position: 2, isCorrect: false },
                    { text: 'Berlin', position: 3, isCorrect: false },
                    { text: 'Madrid', position: 4, isCorrect: false },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  })

  console.log('\n========================================')
  console.log('✅ SEED SUCCESSFUL!')
  console.log('YOUR NEW QUIZ ID:', quiz.id)
  console.log('========================================\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })