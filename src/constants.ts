import { LabConfig, LessonPeriod } from './types';

export const DEFAULT_MATUTINO_PERIODS: LessonPeriod[] = [
  { number: 1, label: 'Aula 1' },
  { number: 2, label: 'Aula 2' },
  { number: 3, label: 'Aula 3' },
  { number: 4, label: 'Aula 4' },
  { number: 5, label: 'Aula 5' },
];

export const DEFAULT_VESPERTINO_PERIODS: LessonPeriod[] = [
  { number: 1, label: 'Aula 1' },
  { number: 2, label: 'Aula 2' },
  { number: 3, label: 'Aula 3' },
];

export const DEFAULT_CONFIG: LabConfig = {
  labName: 'Laboratório de Informática Educativa',
  coordinatorName: 'Responsável do Laboratório',
  coordinatorContact: 'labinfo@escola.edu.br / Ramal 204',
  totalComputers: 32,
  allowSelfCancellation: true,
  matutinoPeriods: DEFAULT_MATUTINO_PERIODS,
  vespertinoPeriods: DEFAULT_VESPERTINO_PERIODS,
};

export const COMMON_EQUIPMENT = [
  'Projetor / DataShow',
  'Caixas de Som',
  'Acesso à Internet / Pesquisa',
  'Fones de Ouvido',
  'Softwares de Escritório (Office/Docs)',
  'Scratch / Programação',
  'Plataforma de Provas / Avaliações',
  'Jogos Educativos',
];

export const COMMON_SUBJECTS = [
  'Matemática',
  'Língua Portuguesa',
  'Ciências',
  'História',
  'Geografia',
  'Biologia',
  'Física',
  'Química',
  'Inglês',
  'Artes',
  'Robótica & Tecnologia',
  'Educação Financeira',
];

export const MATUTINO_GRADES = [
  'Grupo 4 A',
  'Grupo 4 B',
  'Grupo 5 A',
  'Grupo 5 B',
  '1º Ano A',
  '1º Ano B',
  '2º Ano A',
  '2º Ano B',
  '3º Ano A',
  '3º Ano B',
  '4º Ano A',
  '4º Ano B',
  '5º Ano A',
  '5º Ano B',
  '6º Ano A',
  '6º Ano B',
  '7º Ano A',
];

export const VESPERTINO_GRADES = [
  'Grupo 4 C',
  'Grupo 4 D',
  'Grupo 5 C',
  'Grupo 5 D',
  '1º Ano C',
  '1º Ano D',
  '2º Ano C',
  '2º Ano D',
  '3º Ano C',
  '3º Ano D',
  '4º Ano C',
  '5º Ano C',
];

export const COMMON_GRADES = [
  ...MATUTINO_GRADES,
  ...VESPERTINO_GRADES,
];
