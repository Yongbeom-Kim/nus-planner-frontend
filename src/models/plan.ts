import * as input from "./input";
import { Basket } from "./basket";
import { Hydratable, Semester } from "../interfaces/planner";
import { Exclude, Type } from "class-transformer";
export const moduleRegex =
  /(?<prefix>[A-Z]+)(?<codeNumber>\d)\d+(?<suffix>[A-Z]*)/;
export class ModuleState {
  matchedBaskets: Array<Basket> = [];
}
export class Module {
  @Exclude()
  state: ModuleState = new ModuleState();
  @Exclude()
  tags: Set<string> = new Set();
  prefix: string;
  suffix: string;
  code: string;
  level: number;
  name: string;
  credits: number;
  constructor(code: string, name: string, credits: number) {
    this.code = code;
    const match = moduleRegex.exec(code);
    if (match === null || match.groups === undefined) {
      throw new Error(`Invalid module code ${code}`);
    }
    this.level = Number.parseInt(match.groups["codeNumber"]);
    this.name = name;
    this.credits = credits;

    this.prefix = match.groups["prefix"] || "";
    this.suffix = match.groups["suffix"] || "";
  }

  resetState() {
    this.state = new ModuleState();
  }
}

export class AcademicPlan {
  startYear: number;
  plans: Array<SemPlan>;

  @Exclude()
  private modules: Array<Module> = [];

  @Exclude()
  private moduleCodeToModuleMap: Map<string, Module> = new Map();

  constructor(startYear: number, numYears: number = 4) {
    this.startYear = startYear;
    this.plans = new Array(numYears * 4);
    for (let i = 0; i < numYears * 4; i++) {
      this.plans[i] = new SemPlan(Math.floor(i / 4) + 1, (i % 4) + 1, []);
    }
  }

  public get numYears(): number {
    return Math.floor(this.plans.length / 4);
  }

  public get numSemesters(): number {
    return this.plans.length;
  }

  public set numSemesters(newValue: number) {
    this.plans.length = newValue;
  }

  getSemPlan(year: number, semester: SemesterNumber) {
    return this.plans[(year - 1) * 4 + semester];
  }

  preprocess() {
    this.modules = [];
    this.moduleCodeToModuleMap.clear();
    for (const plan of this.plans) {
      for (const mod of plan.modules) {
        this.modules.push(mod);
        this.moduleCodeToModuleMap.set(mod.code, mod);
      }
    }
  }

  getPlanView(): AcademicPlanView {
    this.preprocess();
    return new AcademicPlanView(this, this.modules);
  }

  getModules() {
    return this.modules;
  }

  resetState() {
    this.modules.forEach((module) => module.resetState());
  }

  checkAgainstConfig(config: input.ValidatorState) {
    this.resetState();
    for (const [k, v] of config.doubleCountedModules) {
      if (this.getPlanView().modules.find((m) => m.code === k) === undefined) {
        continue;
      }

      for (const basket of v) {
        basket.doubleCount();
      }
    }

    return this.checkAgainstBasket(config.basket);
  }

  private checkAgainstBasket(basket: Basket): boolean {
    basket.resetSubtreeState();
    return basket.isFulfilledWithState(this.getPlanView()).isFulfilled;
  }
}

enum SemesterNumber {
  EXEMPTION = 0,
  ONE = 1,
  TWO = 2,
  SPECIAL_TERM_ONE = 3,
  SPECIAL_TERM_TWO = 4,
}

export class SemPlan {
  year: number;
  semester: SemesterNumber;
  @Type(() => Module)
  modules: Array<Module>;

  @Exclude()
  private moduleCodeToModuleMap: Map<string, Module> = new Map();

  constructor(year: number, semester: SemesterNumber, modules: Array<Module>) {
    this.year = year;
    this.semester = semester;
    this.modules = modules;
  }

  preprocess() {
    this.moduleCodeToModuleMap.clear();
    for (const mod of this.modules) {
      this.moduleCodeToModuleMap.set(mod.code, mod);
    }
  }
}

@Exclude()
export class AcademicPlanView {
  private academicPlan: AcademicPlan;
  modules: Array<Module>;
  constructor(academicPlan: AcademicPlan, modules: Array<Module>) {
    this.academicPlan = academicPlan;
    this.modules = modules;
  }

  getModules() {
    return this.modules;
  }

  withModules(modules: Array<Module>): AcademicPlanView {
    return new AcademicPlanView(this.academicPlan, modules);
  }

  withModulesFilteredBy(filter: Filter): AcademicPlanView {
    return this.withModules(this.modules.filter(filter.getFilter()));
  }

  withOriginalPlan(): AcademicPlanView {
    return new AcademicPlanView(
      this.academicPlan,
      this.academicPlan.getModules(),
    );
  }
}

@Exclude()
export abstract class Filter {
  abstract filter(module: Module): boolean;

  getFilter() {
    return this.filter.bind(this);
  }
}

@Exclude()
class PropertyFilter<K extends keyof Module> extends Filter {
  propertyName: K;
  equals: Module[K];
  negate: boolean;
  constructor(propertyName: K, equals: Module[K], negate: boolean = false) {
    super();
    this.propertyName = propertyName;
    this.equals = equals;
    this.negate = negate;
  }

  filter(module: Module): boolean {
    return this.negate
      ? module[this.propertyName] != this.equals
      : module[this.propertyName] == this.equals;
  }
}

@Exclude()
class PropertyArrayFilter<K extends keyof Module> extends Filter {
  propertyName: K;
  arr: Array<Module[K]>;

  constructor(propertyName: K, arr: Array<Module[K]>) {
    super();
    this.propertyName = propertyName;
    this.arr = arr;
  }

  filter(module: Module): boolean {
    return !!this.arr.find((x) => x === module[this.propertyName]);
  }
}

@Exclude()
export class PropertySetFilter<K extends keyof Module> extends Filter {
  propertyName: K;
  set: Set<Module[K]>;

  constructor(propertyName: K, set: Set<Module[K]>) {
    super();
    this.propertyName = propertyName;
    this.set = set;
  }

  filter(module: Module): boolean {
    return !this.set.has(module[this.propertyName]);
  }
}
