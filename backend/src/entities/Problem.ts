import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class Problem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column("text")
  description!: string;

  @Column("float")
  timeLimit!: number; // in seconds

  @Column("float")
  memoryLimit!: number; // in MB

  @Column("text")
  testCases!: string; // JSON string containing test cases

  @CreateDateColumn()
  createdAt!: Date;
}
