import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { Problem } from "./Problem";

@Entity()
export class Submission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("text")
  code!: string;

  @Column()
  languageId!: number; // Judge0 language ID

  @Column({ default: "Pending" })
  status!: string;

  @Column({ type: "float", nullable: true })
  time!: number;

  @Column({ type: "float", nullable: true })
  memory!: number;

  @Column({ type: "text", nullable: true })
  stdout!: string;

  @Column({ type: "text", nullable: true })
  stderr!: string;

  @Column({ type: "text", nullable: true })
  compileOutput!: string;

  @ManyToOne(() => Problem)
  problem!: Problem;

  @CreateDateColumn()
  createdAt!: Date;
}
