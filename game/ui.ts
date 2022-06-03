import { sceneConfiguration, sceneSetup } from "../game";

export const crystalUiElement = document.getElementById("crystalCount")!;
export const shieldUiElement = document.getElementById("shieldCount")!;
export const progressUiElement = document.getElementById("courseProgress")!;

export const endLevelDescriptor = document.getElementById("levelDescriptor")!;
export const endLevelShipStatus = document.getElementById("shipStatus")!;

export const nextLevelButton = document.getElementById("nextLevel")!;

export const startAgainButton = document.getElementById("startOver")!;
export const startGameButton = document.getElementById("startGame")!;

export const startPanel = document.getElementById("levelStartPanel")!;

export const uiInit = () => {
  startAgainButton.onclick = () => {
    nextLevel(true);
  };
};

export const nextLevel = (reset: boolean = false) => {
  document.getElementById("endOfLevel")!.style!.display = "";
  document.getElementById("endOfLevel")!.classList.remove("fadeOut");
  document.getElementById("endOfLevel")!.classList.add("hidden");
  document.getElementById("startGame")!.classList.remove("hidden");
  document.getElementById("levelStartPanel")!.classList.remove("hidden");

  sceneConfiguration.cameraStartAnimationPlaying = false;
  sceneConfiguration.rocketMoving = false;
  sceneConfiguration.speed = 0.05;

  sceneConfiguration.speed = sceneConfiguration.level * 0.1;
  if (reset) {
    sceneSetup(1);
  } else {
    sceneSetup(++sceneConfiguration.level);
  }
};

export const updateLevelEndUI = (damaged: boolean) => {
  endLevelDescriptor.innerText = `LEVEL ${sceneConfiguration.level}`;
  if (damaged) {
    endLevelShipStatus.innerText =
      "Nava ta a lovit prea multe pietre și este prea avariată pentru a continua!\r\n\r\n" +
      "Mai avem unul pe care îl poți folosi, dar va trebui să o iei de la capăt...";
    nextLevelButton.classList.add("hidden");
    startAgainButton.classList.remove("hidden");
  } else {
    let shieldCount = sceneConfiguration.data.shieldsCollected;
    if (shieldCount == 5) {
      endLevelShipStatus.innerText = "Nava ta este în stare impecabilă!";
    } else if (shieldCount > 1 && shieldCount < 5) {
      endLevelShipStatus.innerText = "Nava ta este în stare destul de bună.";
    } else if (shieldCount == 0) {
      endLevelShipStatus.innerText =
        "Nava ta este în aceeași stare ca atunci când ai plecat.";
    } else if (shieldCount >= -4 && shieldCount < 0) {
      endLevelShipStatus.innerText =
        "Nava ta este într-o stare destul de proastă. Îl vom repara, dar încercăm să lovim mai puține pietre.";
    }

    nextLevelButton.classList.remove("hidden");
    startAgainButton.classList.add("hidden");
  }
};

export const showLevelEndScreen = () => {
  document.getElementById("endOfLevel")!.style!.display = "flex";
  document.getElementById("endOfLevel")!.classList.add("fadeOut");
  document.getElementById("crystalCountLevelEnd")!.innerText = String(
    sceneConfiguration.data.crystalsCollected
  );
};
export const setProgress = (progress: string) => {
  let progressElement = document.getElementById("loadingProgress");
  if (progressElement != null) {
    progressElement.innerText = progress;
  }
};
