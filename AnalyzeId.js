import React, { useEffect, useState } from "react";
import { View, Button, Alert, Image, Text, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { S3, Textract } from "aws-sdk/dist/aws-sdk-react-native";

const AnalyzeId = () => {
  console.log("App started");

  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [showPassportNumber, setShowPassportNumber] = useState(null);
  const [showPersonalNumber, setShowPersonalNumber] = useState(null);
  const [showExpiryDate, setShowExpiryDate] = useState(null);
  const [mrzIsValid, setMrzIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mrzCode, setMrzCode] = useState(null);
  const [uploadCount, setUploadCount] = useState(0); // State for counting uploads

  useEffect(() => {
    (async () => {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Please enable media library access to use this feature."
        );
      }
    })();
  }, []);

  const s3 = new S3({
    region: process.env.EXPO_PUBLIC_AWS_REGION,
    credentials: {
      accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY,
      secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
  });

  const textract = new Textract({
    region: process.env.EXPO_PUBLIC_AWS_REGION,
    credentials: {
      accessKeyId: process.env.EXPO_PUBLIC_AWS_ACCESS_KEY,
      secretAccessKey: process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
  });

  const uploadImageToS3 = async (fileUri, fileName) => {
    try {
      setIsLoading(true);
      if (!fileUri) {
        throw new Error("File URI is undefined or null.");
      }

      const fileType = fileUri.split(".").pop();
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const params = {
        Bucket: process.env.EXPO_PUBLIC_AWS_BUCKET_NAME,
        Key: fileName,
        ContentType: `image/${fileType}`,
        Body: blob,
      };

      const data = await s3.upload(params).promise();
      console.log("Upload successful:", data.Location);

      setUploadCount((prevCount) => prevCount + 1); // Increment upload counter
      setUploadedImageUrl(data.Location);

      await analyzeID(data.Location);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload failed", "Failed to upload image to S3.");
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeID = async (imageUrl) => {
    const params = {
      DocumentPages: [
        {
          S3Object: {
            Bucket: process.env.EXPO_PUBLIC_AWS_BUCKET_NAME,
            Name: imageUrl.split("/").pop(),
          },
        },
      ],
    };

    try {
      const response = await textract.analyzeID(params).promise();

      const identityDocumentFields =
        response.IdentityDocuments[0].IdentityDocumentFields;

      for (let field of identityDocumentFields) {
        if (field.Type.Text === "MRZ_CODE") {
          let mrzCodeText = field?.ValueDetection?.Text;

          if (mrzCodeText) {
            const mrzLines = mrzCodeText.split("\n");
            const mrzLastLine = mrzLines[mrzLines.length - 1];
            console.log("Last MRZ line:", mrzLastLine);

            const result = validateMRZ(mrzLastLine);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Textract error:", error);
      Alert.alert("Textract failed", "Failed to extract text from the image.");
    } finally {
      setIsLoading(false);
    }
  };

  const getCharacterValue = (char) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    if (char >= "0" && char <= "9") {
      return parseInt(char);
    } else if (char >= "A" && char <= "Z") {
      return alphabet.indexOf(char) + 10;
    } else {
      return 0; // Placeholder < is treated as 0
    }
  };

  const calculateCheckDigit = (input) => {
    const weights = [7, 3, 1];
    let sum = 0;

    for (let i = 0; i < input.length; i++) {
      const value = getCharacterValue(input[i]);
      sum += value * weights[i % 3];
    }

    return sum % 10;
  };

  const parseDate = (yyMMdd) => {
    const year = parseInt(yyMMdd.substring(0, 2), 10);
    const month = parseInt(yyMMdd.substring(2, 4), 10) - 1;
    const day = parseInt(yyMMdd.substring(4, 6), 10);

    const fullYear = year >= 50 ? 1900 + year : 2000 + year;

    return new Date(fullYear, month, day);
  };

  const validateMRZ = (mrz) => {
    if (!mrz) {
      console.error("MRZ code is null or undefined");
      return {
        isPassportNumberValid: false,
        isBirthDateValid: false,
        isExpirationDateValid: false,
        isPersonalNumberValid: false,
        isFinalCheckDigitValid: false,
        isExpirationDateNotExpired: false,
        isValid: false,
      };
    }

    const passportNumber = mrz.substring(0, 9);
    const passportNumberCheckDigit = parseInt(mrz[9]);
    const birthDate = mrz.substring(13, 19);
    const birthDateCheckDigit = parseInt(mrz[19]);
    const expirationDate = mrz.substring(21, 27);
    const expirationDateCheckDigit = parseInt(mrz[27]);
    const personalNumber = mrz.substring(28, 42);
    const personalNumberCheckDigit = parseInt(mrz[42]);
    const finalCheckDigit = parseInt(mrz[43]);

    const isPassportNumberValid =
      calculateCheckDigit(passportNumber) === passportNumberCheckDigit;
    const isBirthDateValid =
      calculateCheckDigit(birthDate) === birthDateCheckDigit;
    const isExpirationDateValid =
      calculateCheckDigit(expirationDate) === expirationDateCheckDigit;
    const isPersonalNumberValid =
      calculateCheckDigit(personalNumber) === personalNumberCheckDigit;

    const expirationDateObj = parseDate(expirationDate);
    const currentDate = new Date();
    const isExpirationDateNotExpired = expirationDateObj >= currentDate;

    const combined =
      passportNumber +
      passportNumberCheckDigit +
      birthDate +
      birthDateCheckDigit +
      expirationDate +
      expirationDateCheckDigit +
      personalNumber +
      personalNumberCheckDigit;
    const isFinalCheckDigitValid =
      calculateCheckDigit(combined) === finalCheckDigit;

    const isValid =
      isPassportNumberValid &&
      isBirthDateValid &&
      isExpirationDateValid &&
      isPersonalNumberValid &&
      isFinalCheckDigitValid &&
      isExpirationDateNotExpired;

    setMrzIsValid(isValid);
    setShowPassportNumber(passportNumber);
    setShowPersonalNumber(personalNumber.slice(0, 10));
    setShowExpiryDate(expirationDate);

    return {
      isPassportNumberValid,
      isBirthDateValid,
      isExpirationDateValid,
      isPersonalNumberValid,
      isFinalCheckDigitValid,
      isExpirationDateNotExpired,
      isValid,
    };
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.assets[0].cancelled) {
        const uri = result.assets[0].uri;
        const fileName = `image-${Date.now()}.jpg`;
        await uploadImageToS3(uri, fileName);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Image picker failed", "Failed to pick an image.");
    }
  };

  return (
    <>
      <View style={{ alignItems: "center", marginTop: 20 }}>
        <Text>Passport Images Uploaded: {uploadCount}</Text>
      </View>
      <View
        style={{
          height: 400,
          alignItems: "center",
          marginTop: 20,
          marginBottom: 20,
          borderBottomColor: "black",
          borderBottomWidth: 1,
          justifyContent: "flex-end",
        }}
      >
        {uploadedImageUrl && (
          <Image
            source={{ uri: uploadedImageUrl }}
            style={{ width: "100%", height: 300 }}
          />
        )}
        <View
          style={{ margin: 20, justifyContent: "center", alignItems: "center" }}
        >
          <Button title="Upload Image" onPress={pickImage} />

          {isLoading ? (
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "blue" }}>
              Passport validation is processing...
            </Text>
          ) : (
            <>
              {!mrzIsValid ? (
                <>
                  {uploadedImageUrl ? (
                    <>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: "red",
                        }}
                      >
                        Passport validation failed
                      </Text>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: "red",
                        }}
                      >
                        You have to upload a valid document
                      </Text>
                    </>
                  ) : null}
                </>
              ) : (
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "green" }}
                >
                  Passport validation done
                </Text>
              )}
            </>
          )}
        </View>
      </View>
      <View
        style={{
          marginHorizontal: 20,
          flexDirection: "row",
          justifyContent: "space-around",
          gap: 20,
        }}
      >
        <View style={{ flex: 1 }}>
          <>
            <Text>Passport Number</Text>
            <TextInput
              style={{
                height: 40,
                borderColor: "gray",
                borderWidth: 1,
                paddingHorizontal: 10,
                marginTop: 5,
              }}
              value={mrzIsValid ? showPassportNumber : ""}
              editable={false}
            />
          </>
          <>
            <Text>Date of Expiry</Text>
            <TextInput
              style={{
                height: 40,
                borderColor: "gray",
                borderWidth: 1,
                paddingHorizontal: 10,
                marginTop: 5,
              }}
              value={mrzIsValid ? showExpiryDate : ""}
              editable={false}
            />
          </>
        </View>
        <View style={{ flex: 1 }}>
          <Text>NID Number</Text>
          <TextInput
            style={{
              height: 40,
              borderColor: "gray",
              borderWidth: 1,
              paddingHorizontal: 10,
              marginTop: 5,
              width: "100%",
            }}
            value={mrzIsValid ? showPersonalNumber : ""}
            editable={false}
          />
        </View>
      </View>
    </>
  );
};

export default AnalyzeId;
