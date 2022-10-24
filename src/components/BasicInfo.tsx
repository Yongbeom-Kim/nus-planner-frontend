import { Select, FormControl, HStack, Heading, Button } from "@chakra-ui/react";
import { plainToClass, plainToInstance, Type } from "class-transformer";
import { majors, specialisations } from "../constants/dummyModuleData";
import { useState, SetStateAction, useCallback, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { labelModules } from "../utils/plannerUtils";
import { MainViewModel } from "../models";

const baseUrl = "https://raw.githubusercontent.com/nus-planner/frontend/main/";

class DirectoryList {
  @Type(() => DirectoryListing)
  files: DirectoryListing[] = [];
}

class DirectoryListing {
  static requirementsBaseUrl =
    "https://raw.githubusercontent.com/nus-planner/frontend/main/locals/requirements/";
  static studyPlanBaseUrl =
    "https://raw.githubusercontent.com/nus-planner/frontend/main/locals/study-plans/";
  cohort!: number;
  faculty!: string;
  course!: string;
  filename!: string;
  get url(): string {
    return `${DirectoryListing.requirementsBaseUrl}/${this.filename}`;
  }

  get planUrl(): string {
    return `${DirectoryListing.studyPlanBaseUrl}/${this.filename}`;
  }
}

const BasicInfo = () => {
  const [, updateState] = useState<{}>();
  const forceUpdate = useCallback(() => updateState({}), []);
  const { mainViewModel, setMainViewModel } = useAppContext();
  const [directoryList, setDirectoryList] = useState<DirectoryList>({
    files: [],
  });

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/nus-planner/frontend/main/locals/requirements/dir.json",
    )
      .then((res) => res.json())
      .then((plain) => plainToInstance(DirectoryList, plain))
      .then((directoryList) => {
        setDirectoryList(directoryList);
      });
  }, []);

  // Basic info of the user
  const years: number[] = [];
  const currYear = new Date().getFullYear();
  // Assume a student stays in NUS for at most 5 years
  for (let i = 0; i < 5; i++) {
    years.push(currYear - i);
  }

  const majorMap = new Map<number, DirectoryListing[]>();
  for (let year of years) {
    majorMap.set(year, []);
  }

  // Load hardcoded data
  for (let requirementInfo of directoryList.files) {
    majorMap.get(requirementInfo.cohort)?.push(requirementInfo);
  }

  console.log("Majormap");
  console.log(majorMap);

  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const handleYearChange = (event: {
    target: { value: SetStateAction<string> };
  }) => {
    setYear(event.target.value);
  };
  const handleMajorChange = (event: {
    target: { value: SetStateAction<string> };
  }) => {
    console.log(event.target.value);
    setMajor(event.target.value);
  };

  const loadRequirement = () => {
    const listing = majorMap.get(parseInt(year))?.[parseInt(major)];
    const url = listing?.url ?? "";
    const sampleStudyPlanUrl = listing?.planUrl;
    const newModel = new MainViewModel(parseInt(year), 4, sampleStudyPlanUrl);
    newModel.initializeFromURL(url).then(() => {
      setMainViewModel(newModel);
      forceUpdate();
      const moduleArr = Array.from(newModel.modulesMap.values());
      labelModules(moduleArr);
    });
  };

  return (
    <HStack spacing={"1rem"}>
      <Heading fontSize={"2xl"} fontWeight={"bold"} fontFamily={"body"}>
        NUS Planner
      </Heading>
      <FormControl w="-moz-fit-content">
        <Select
          placeholder="Choose your enrollment year"
          onChange={handleYearChange}
          value={year}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              AY{year}/{year + 1}
            </option>
          ))}
        </Select>
      </FormControl>

      {year && (
        <FormControl w="-moz-fit-content">
          <Select placeholder="Choose your major" onChange={handleMajorChange}>
            {(majorMap.get(parseInt(year)) ?? []).map((req, idx) => (
              <option key={idx} value={idx}>
                {req.course}
              </option>
            ))}
          </Select>
        </FormControl>
      )}
      {major && (
        <Button
          size="sm"
          colorScheme={"white"}
          variant="outline"
          onClick={loadRequirement}
        >
          Load Requirement
        </Button>
      )}
    </HStack>
  );
};

export default BasicInfo;
