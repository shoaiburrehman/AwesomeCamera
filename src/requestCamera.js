import { Platform } from "react-native";
import { check, PERMISSIONS, RESULTS, request } from "react-native-permissions";

export const requestCameraPermission = () => {
    let permissionToRequest = "";
    let permissionRequestResult = "";

    if (Platform.OS === "ios")
        permissionToRequest = PERMISSIONS.IOS.CAMERA;
    else
        permissionToRequest = PERMISSIONS.ANDROID.CAMERA;

    return request(permissionToRequest).then((result) => {
        permissionRequestResult = result;
        console.log(result);
        return permissionRequestResult;
    })
    .catch((error) => {
        console.log(error);
    });
}
