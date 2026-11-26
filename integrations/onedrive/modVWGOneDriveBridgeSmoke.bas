Attribute VB_Name = "modVWGOneDriveBridgeSmoke"
Option Explicit

' VWG Dispatcher 2.0 - OneDrive Bridge smoke test
' This module ONLY writes a harmless test marker file.
' It does not read the workbook, Outlook, mailbox contents, tracker rows,
' assignment state, categories, colleague names, Order Numbers or VINs.
' It does not use WScript.Shell, Windows commands, WinHTTP or network APIs.

Private Const BRIDGE_FOLDER_NAME As String = "VWGDispatcherBridge"
Private Const SMOKE_FOLDER_NAME As String = "smoke-test"

' Optional fallback. Leave blank to use OneDrive environment variables.
' If automatic detection fails, paste the EXISTING local OneDrive sync-root
' folder path between the quotes. Do not use a web URL here.
Private Const BRIDGE_ONEDRIVE_ROOT_OVERRIDE As String = ""

Private Const SMOKE_MARKER As String = "vwg-dispatcher-onedrive-bridge-smoke-test"

Public Sub VWG_Bridge_CheckOneDriveRoot()
    Dim oneDriveRoot As String
    Dim detectedFrom As String

    oneDriveRoot = VWG_Bridge_ResolveOneDriveRoot(detectedFrom)

    If Len(oneDriveRoot) = 0 Then
        MsgBox "I could not find a local OneDrive sync folder." & vbCrLf & vbCrLf & _
               "No files were created." & vbCrLf & _
               "If OneDrive is synced in this Citrix session, copy its local folder " & _
               "path from File Explorer and set BRIDGE_ONEDRIVE_ROOT_OVERRIDE " & _
               "near the top of this module.", _
               vbExclamation, "VWG OneDrive Bridge"
        Exit Sub
    End If

    MsgBox "OneDrive sync root detected." & vbCrLf & vbCrLf & _
           "Detection: " & detectedFrom & vbCrLf & _
           "Folder: " & oneDriveRoot & vbCrLf & vbCrLf & _
           "This confirms a local folder path only. It does not yet prove that " & _
           "OneDrive has synchronised a file to the cloud.", _
           vbInformation, "VWG OneDrive Bridge"
End Sub

Public Sub VWG_Bridge_WriteSmokeTest()
    Dim oneDriveRoot As String
    Dim detectedFrom As String
    Dim bridgeFolder As String
    Dim smokeFolder As String
    Dim probeId As String
    Dim createdAtLocal As String
    Dim temporaryPath As String
    Dim finalPath As String
    Dim jsonText As String
    Dim fileNumber As Integer
    Dim fileIsOpen As Boolean
    Dim failureNumber As Long
    Dim failureDescription As String

    On Error GoTo Failed

    oneDriveRoot = VWG_Bridge_ResolveOneDriveRoot(detectedFrom)

    If Len(oneDriveRoot) = 0 Then
        MsgBox "No local OneDrive sync folder was detected. Run " & _
               "VWG_Bridge_CheckOneDriveRoot first.", _
               vbExclamation, "VWG OneDrive Bridge"
        Exit Sub
    End If

    bridgeFolder = oneDriveRoot & "\" & BRIDGE_FOLDER_NAME
    smokeFolder = bridgeFolder & "\" & SMOKE_FOLDER_NAME

    VWG_Bridge_EnsureFolder bridgeFolder
    VWG_Bridge_EnsureFolder smokeFolder

    probeId = VWG_Bridge_NewProbeId()
    createdAtLocal = Format$(Now, "yyyy-mm-dd\THH:nn:ss")

    temporaryPath = smokeFolder & "\" & probeId & ".partial"
    finalPath = smokeFolder & "\" & probeId & ".json"

    jsonText = VWG_Bridge_BuildProbeJson(probeId, createdAtLocal)

    fileNumber = FreeFile
    Open temporaryPath For Output As #fileNumber
    fileIsOpen = True
    Print #fileNumber, jsonText
    Close #fileNumber
    fileIsOpen = False

    ' Publish only after the complete file has been closed.
    ' Future consumers must ignore .partial files and read only .json files.
    Name temporaryPath As finalPath

    MsgBox "The OneDrive smoke-test file was created locally." & vbCrLf & vbCrLf & _
           "Detected using: " & detectedFrom & vbCrLf & _
           "File: " & finalPath & vbCrLf & vbCrLf & _
           "Next, check that this exact JSON file appears in OneDrive on the web " & _
           "or on another synchronised device." & vbCrLf & _
           "A local file alone is not proof that cloud synchronisation completed.", _
           vbInformation, "VWG OneDrive Bridge - File Created"

    Exit Sub

Failed:
    failureNumber = Err.Number
    failureDescription = Err.Description

    On Error Resume Next
    If fileIsOpen Then Close #fileNumber
    If Len(temporaryPath) > 0 Then
        If Len(Dir$(temporaryPath)) > 0 Then Kill temporaryPath
    End If
    On Error GoTo 0

    MsgBox "The OneDrive smoke test could not create its file." & vbCrLf & vbCrLf & _
           "Error: " & CStr(failureNumber) & vbCrLf & _
           failureDescription & vbCrLf & vbCrLf & _
           "No Outlook assignment or tracker data was changed.", _
           vbCritical, "VWG OneDrive Bridge"
End Sub

Private Function VWG_Bridge_ResolveOneDriveRoot(ByRef detectedFrom As String) As String
    Dim candidate As String
    Dim environmentNames As Variant
    Dim environmentName As Variant

    detectedFrom = vbNullString

    If Len(Trim$(BRIDGE_ONEDRIVE_ROOT_OVERRIDE)) > 0 Then
        candidate = VWG_Bridge_NormaliseFolderPath(Trim$(BRIDGE_ONEDRIVE_ROOT_OVERRIDE))
        If VWG_Bridge_FolderExists(candidate) Then
            detectedFrom = "BRIDGE_ONEDRIVE_ROOT_OVERRIDE"
            VWG_Bridge_ResolveOneDriveRoot = candidate
            Exit Function
        End If
    End If

    environmentNames = Array("OneDriveCommercial", "OneDrive", "OneDriveConsumer")

    For Each environmentName In environmentNames
        candidate = Trim$(Environ$(CStr(environmentName)))

        If Len(candidate) > 0 Then
            candidate = VWG_Bridge_NormaliseFolderPath(candidate)

            If VWG_Bridge_FolderExists(candidate) Then
                detectedFrom = CStr(environmentName)
                VWG_Bridge_ResolveOneDriveRoot = candidate
                Exit Function
            End If
        End If
    Next environmentName
End Function

Private Function VWG_Bridge_NormaliseFolderPath(ByVal folderPath As String) As String
    folderPath = Trim$(folderPath)

    Do While Len(folderPath) > 3 And Right$(folderPath, 1) = "\"
        folderPath = Left$(folderPath, Len(folderPath) - 1)
    Loop

    VWG_Bridge_NormaliseFolderPath = folderPath
End Function

Private Function VWG_Bridge_FolderExists(ByVal folderPath As String) As Boolean
    Dim attributes As Long

    On Error Resume Next
    attributes = GetAttr(folderPath)

    If Err.Number = 0 Then
        VWG_Bridge_FolderExists = ((attributes And vbDirectory) = vbDirectory)
    End If

    Err.Clear
    On Error GoTo 0
End Function

Private Sub VWG_Bridge_EnsureFolder(ByVal folderPath As String)
    If VWG_Bridge_FolderExists(folderPath) Then Exit Sub

    MkDir folderPath

    If Not VWG_Bridge_FolderExists(folderPath) Then
        Err.Raise vbObjectError + 2401, _
                  "VWG OneDrive Bridge", _
                  "The folder could not be created: " & folderPath
    End If
End Sub

Private Function VWG_Bridge_NewProbeId() As String
    Dim millisecondPart As Long
    Dim randomPart As Long

    Randomize
    millisecondPart = CLng(Timer * 1000) Mod 1000000
    randomPart = Int(Rnd() * 1000000)

    VWG_Bridge_NewProbeId = "ODSMOKE-" & _
                            Format$(Now, "yyyymmdd-hhnnss") & "-" & _
                            Format$(millisecondPart, "000000") & "-" & _
                            Format$(randomPart, "000000")
End Function

Private Function VWG_Bridge_BuildProbeJson( _
    ByVal probeId As String, _
    ByVal createdAtLocal As String) As String

    VWG_Bridge_BuildProbeJson = _
        "{" & vbCrLf & _
        "  ""probe_schema_version"": ""1.0""," & vbCrLf & _
        "  ""probe_id"": """ & probeId & """," & vbCrLf & _
        "  ""probe_type"": ""bridge_smoke_test""," & vbCrLf & _
        "  ""source_system"": ""VWG_Outlook_VBA""," & vbCrLf & _
        "  ""created_at_local"": """ & createdAtLocal & """," & vbCrLf & _
        "  ""time_basis"": ""Citrix Windows local time; UTC conversion not asserted""," & vbCrLf & _
        "  ""record_count"": 0," & vbCrLf & _
        "  ""contains_operational_data"": false," & vbCrLf & _
        "  ""payload"": {" & vbCrLf & _
        "    ""test_marker"": """ & SMOKE_MARKER & """" & vbCrLf & _
        "  }" & vbCrLf & _
        "}"
End Function
