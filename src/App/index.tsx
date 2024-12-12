import React, { useCallback, useState, useEffect } from "react";
import thunk from "redux-thunk";
import localForage from "localforage";
import { Provider } from "react-redux";
import { composeWithDevTools } from "redux-devtools-extension";
import PassSelector from "../PassSelector";
import { createStore, applyMiddleware } from "redux";
import Configurator from "../Configurator";
import * as Store from "@pkvd/store";
import LoaderFace from "../Loader";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { PassMediaProps, PassMixedProps } from "@pkvd/pass";
import { v1 as uuid } from "uuid";
import { ExportErrors, TemplateProps } from "../Configurator/Viewer";
import JSZip from "jszip";
import { PassKind } from "../model";

const ZIP_FILE_PATH_SPLIT_REGEX = /(?:(?<language>.+)\.lproj\/)?(?<realFileName>.+)?/;
const ZIP_FILE_IGNORE_REGEX = /(^\.|manifest\.json|signature|personalization\.json)/;
const ZIP_FILE_STRINGS_PV_SPLIT_REGEX = /(?<placeholder>.+)\s=\s(?<value>.+);/;
const ZIP_FILE_STRINGS_PV_QUOTES_REPLACE_REGEX = /"/g;
const ZIP_FILE_NAME_EXT_REGEX = /(?<fileName>.+)\.(?<ext>(png|jpg))/;

export interface StateLookalike {
	pass: Partial<PassMixedProps>;
	translations: {
		[language: string]: [placeholder: string, value: string][];
	};
	media: {
		[language: string]: [fileName: string, buffer: ArrayBuffer][];
	};
	projectOptions: ProjectOptions;
}

interface ProjectOptions {
	title: string;
	template: number;
}

/**
 * Loading time is used to sync loading
 * with animations.
 */

const LOADING_TIME_MS = 1500;

const store = createStore(
	Store.reducers,
	Store.initialState,
	composeWithDevTools(
		applyMiddleware(
			Store.middlewares.CreationMiddleware,
			Store.middlewares.CollectionEditUrlMiddleware,
			Store.middlewares.CollectionActivationMiddleware,
			Store.middlewares.PurgeMiddleware
		),
		applyMiddleware(thunk),
		/** Order here is important. We want to execute next mid after thunks */
		applyMiddleware(Store.middlewares.LocalForageSaveMiddleware)
	)
);

/**
 * A container that allows us to have
 * a loading overlay with transition
 * and to use history and location hooks
 * in App component below
 */

export default function AppRoutingLoaderContainer({
	templates = [],
	onExport,
  onValidateFields,
	exportTitle = null,
  exportButtonRef = null,
  project = null,
	hiddenFields = [],
	...rest
}) {
	const [isLoading, setLoading] = useState(true);

	return (
		<Provider store={store}>
			<CSSTransition mountOnEnter unmountOnExit in={isLoading} timeout={500}>
				<LoaderFace />
			</CSSTransition>
			<App
				isLoading={isLoading}
				setLoading={setLoading}
				project={project}
				templates={templates}
				onExport={onExport}
				onValidateFields={onValidateFields}
				exportTitle={exportTitle}
				exportButtonRef={exportButtonRef}
				hiddenFields={hiddenFields}
				{...rest}
			/>
		</Provider>
	);
}

interface Project {
	title?: string;
	template?: number;
	file?: File;
}

interface Props {
	isLoading: boolean;
	setLoading(state: React.SetStateAction<boolean>): void;
	templates: Array<TemplateProps>;
	onExport(data: Object): void;
	onValidateFields(data: Object): void;
	exportTitle?: string;
	exportButtonRef?: React.RefObject<HTMLButtonElement>;
	hiddenFields: Array<string>;
	project?: Project;
}

function App(props: Props): JSX.Element {
	const [forageData, setForageData] = useState<Store.Forage.ForageStructure>();
	const [isProcessingZipFile, setProcessingZipFile] = useState(false);
	const [showConfigurator, setShowConfigurator] = useState(false);
	const [exportErrors, setExportErrors] = useState<ExportErrors>({
		description: false,
		organizationName: false,
		passTypeIdentifier: false,
		teamIdentifier: false,
		title: false,
		template: false,
	});

	const wrapLoading = useCallback(
		async (phase: Function, minTimeBeforeExecution?: number, minTimeBeforeCompletion?: number) => {
			props.setLoading(true);

			await Promise.all([
				minTimeBeforeCompletion
					? createDelayedPromise(minTimeBeforeCompletion, null)
					: Promise.resolve(),
				minTimeBeforeExecution
					? createDelayedPromise(minTimeBeforeExecution, phase)
					: Promise.resolve(phase()),
			]);

			props.setLoading(false);
		},
		[]
	);

	const onValidateFields = useCallback(
		async (errors: Object) => {
			setExportErrors((exportErrors) => {
				const newExportErrors = { ...exportErrors, ...errors };

				if (!!props.onValidateFields) {
					props.onValidateFields(newExportErrors);
				}

				return newExportErrors;
			});
		},
		[props.onValidateFields]
	);

	const onPassSelect = useCallback((preloadCallback?: Function) => {
		wrapLoading(
			() => {
				preloadCallback?.();
				setShowConfigurator(true);
			},
			null,
			LOADING_TIME_MS
		);
	}, []);

	const refreshForageCallback = useCallback(async () => {
		const slices: (keyof Store.Forage.ForageStructure)[] = ["projects"];

		const data = Object.assign(
			{},
			...(
				await Promise.all(
					slices.map((slice) =>
						localForage.getItem<Store.Forage.ForageStructure[typeof slice]>(slice)
					)
				)
			).map((data, index) => ({ [slices[index]]: data }))
		) as Store.Forage.ForageStructure;

		setForageData(data);
	}, []);

	const initializeStore = useCallback(
		async (snapshot: Store.State) => {
			sessionStorage.clear();
			/**
			 * Trick to show loader, so if this takes a bit of time,
			 * UI doesn't seems to be stuck.
			 * @TODO Actually, what would be better is not firing Init until
			 * we are not sure that resolutions URLs have been generated.
			 * For the moment we are using the same normal flow, through
			 * middlewares.
			 */

			store.dispatch(Store.Forage.Init(snapshot));

			/** Iterating through medias so we can create and set URLs for array buffers */

			const availableMediaLanguages = Object.entries(snapshot.media);

			for (
				let i = availableMediaLanguages.length, localized: typeof availableMediaLanguages[0];
				(localized = availableMediaLanguages[--i]);

			) {
				const [language, mediaSet] = localized;
				const mediaEntries = Object.entries(mediaSet) as [
					keyof PassMediaProps,
					Store.CollectionSet
				][];

				for (
					let i = mediaEntries.length, mediaEntry: typeof mediaEntries[0];
					(mediaEntry = mediaEntries[--i]);

				) {
					const [mediaName, collectionSet] = mediaEntry;
					const collectionEntries = Object.entries(collectionSet.collections);

					for (
						let i = collectionEntries.length, collectionEntry: typeof collectionEntries[0];
						(collectionEntry = collectionEntries[--i]);

					) {
						const [collectionID, collection] = collectionEntry;

						store.dispatch(
							Store.Media.EditCollection(mediaName, language, collectionID, collection)
						);
					}
				}
			}
		},
		[forageData?.projects]
	);

	const initializeStoreByProjectID = useCallback(
		(projectID: string) => {
			if (!forageData.projects[projectID]) {
				throw `No project with id ${projectID}. Is there any kind of caching happening?`;
			}

			const { snapshot } = forageData.projects[projectID];

			return initializeStore(snapshot);
		},
		[initializeStore]
	);

	const createProjectFromArchive = useCallback(
		(data: StateLookalike) => {
			wrapLoading(
				() => {
					const translations = Object.entries(
						data.translations
					).reduce<Store.LocalizedTranslationsGroup>(
						(acc, [lang, contents]) => ({
							...acc,
							[lang]: {
								enabled: true,
								translations: contents.reduce(
									(acc, content) => ({
										...acc,
										[uuid()]: content,
									}),
									{}
								),
							},
						}),
						{}
					);

					const mediaNameCollIDMap = new Map();

					const media = Object.entries(data.media).reduce<Store.LocalizedMediaGroup>(
						(acc, [lang, contents]) => {
							return {
								...acc,
								[lang]: contents.reduce((acc, [fileName, buffer]) => {
									const mediaNameWithoutExtOrResolution = fileName.replace(
										/(@\dx)?\.(.+)$/,
										""
									) as keyof PassMediaProps;
									let collectionID: string = mediaNameCollIDMap.get(
										mediaNameWithoutExtOrResolution
									);

									if (!collectionID) {
										collectionID = uuid();
										mediaNameCollIDMap.set(mediaNameWithoutExtOrResolution, collectionID);
									}

									const resolutionID = uuid();
									const collectionSet = {
										activeCollectionID: collectionID,
										enabled: true,
										collections: {
											[collectionID]: {
												name: `Imported Collection ${mediaNameWithoutExtOrResolution}`,
												resolutions: {
													...(acc[mediaNameWithoutExtOrResolution]?.["collections"]?.[collectionID]
														?.resolutions || null),
													[resolutionID]: {
														name: fileName,
														content: buffer,
													},
												},
											},
										},
									};

									return {
										...acc,
										[mediaNameWithoutExtOrResolution]: collectionSet,
									};
								}, {}),
							};
						},
						{}
					);

					const snapshot: Store.State = Object.assign({}, Store.initialState, {
						pass: data.pass,
						translations,
						projectOptions: {
							title: data.projectOptions.title,
							template: data.projectOptions.template,
							activeMediaLanguage: "default",
						},
						media,
					});

					initializeStore(snapshot);
					setShowConfigurator(true);
				},
				LOADING_TIME_MS,
				LOADING_TIME_MS
			);
		},
		[initializeStore]
	);

	const processUploadedFile = async (event: React.FormEvent<HTMLInputElement>, projectOptions: ProjectOptions) => {
		const { currentTarget } = event;
		const { files: uploadFiles } = currentTarget;

		props.setLoading(true);
		setProcessingZipFile(true);

		try {
			const parsedPayload: StateLookalike = {
				pass: null,
				translations: {},
				media: {},
				projectOptions: {
					title: projectOptions.title || "Imported Project",
					template: projectOptions.template || null
				},
			};

			const firstZipFile = Array.prototype.find.call(uploadFiles, (file: File) =>
				/.+\.(zip|pkpass)/.test(file.name)
			);

			if (!firstZipFile) {
				const ext = uploadFiles[0].name.match(/\.(.+)/g)[0];
				throw new Error(
					`Unsupported file type (${ext}). Only .zip and .pkpass can be used as starting point.`
				);
			}

			let zip: JSZip = null;

			try {
				zip = await JSZip.loadAsync(firstZipFile, { createFolders: false });
			} catch (err) {
				throw new Error(`Zip loading error (${err}).`);
			} finally {
				currentTarget.value = ""; /** Resetting input */
			}

			const filesNames = Object.entries(zip.files);

			for (let i = filesNames.length, file: typeof filesNames[0]; (file = filesNames[--i]); ) {
				const [filePath, fileObject] = file;

				const match = filePath.match(ZIP_FILE_PATH_SPLIT_REGEX);
				const { language, realFileName } = match.groups as {
					language?: string;
					realFileName?: string;
				};

				const isIgnoredFile = ZIP_FILE_IGNORE_REGEX.test(realFileName);
				const isDirectoryRecord = language && !realFileName;
				const isFileInDirectory = language && realFileName;

				const shouldSkip =
					/** Ignoring record, it is only the folder, we don't need it */
					isDirectoryRecord ||
					/** Is dynamic or unsupported file */
					isIgnoredFile;

				if (shouldSkip) {
					continue;
				}

				if (realFileName === "pass.json") {
					try {
						let passInfo;

						try {
							passInfo = JSON.parse(await fileObject.async("string"));
						} catch (err) {
							throw `Bad JSON. (${err})`;
						}

						const {
							boardingPass,
							coupon,
							storeCard,
							eventTicket,
							generic,
							...otherPassProps
						} = passInfo;
						const { transitType } = boardingPass || {};

						let kind: PassKind = null;
						let sourceOfFields = null;

						if (boardingPass) {
							kind = PassKind.BOARDING_PASS;
							const { transitType, ...boarding } = boardingPass;
							sourceOfFields = boarding;
						} else if (coupon) {
							kind = PassKind.COUPON;
							sourceOfFields = coupon;
						} else if (storeCard) {
							kind = PassKind.STORE;
							sourceOfFields = storeCard;
						} else if (eventTicket) {
							kind = PassKind.EVENT;
							sourceOfFields = eventTicket;
						} else if (generic) {
							kind = PassKind.GENERIC;
							sourceOfFields = generic;
						} else {
							throw "Missing kind (boardingPass, coupon, storeCard, eventTicket, generic) to start from.";
						}

						parsedPayload.pass = Object.assign(otherPassProps, {
							kind,
							transitType,
							...(sourceOfFields || null),
						});

						continue;
					} catch (err) {
						throw new Error(`Cannot parse pass.json: ${err}`);
					}
				}

				if (isFileInDirectory) {
					if (realFileName === "pass.strings") {
						/**
						 * Replacing BOM (Byte order mark).
						 * This could affect matching between
						 * fields and placeholders.
						 */

						const file = (await fileObject.async("string")).replace(/\uFEFF/g, "");

						file
							.split("\n")
							.map((row) => row.match(ZIP_FILE_STRINGS_PV_SPLIT_REGEX))
							.forEach((match) => {
								if (!match?.groups) {
									return;
								}

								(parsedPayload.translations[language] ??= []).push([
									match.groups.placeholder.replace(ZIP_FILE_STRINGS_PV_QUOTES_REPLACE_REGEX, ""),
									match.groups.value.replace(ZIP_FILE_STRINGS_PV_QUOTES_REPLACE_REGEX, ""),
								]);
							});
					} else if (ZIP_FILE_NAME_EXT_REGEX.test(realFileName)) {
						const file = await fileObject.async("arraybuffer");

						(parsedPayload.media[language] ??= []).push([realFileName, file]);
					}
				} else {
					const file = await fileObject.async("arraybuffer");

					(parsedPayload.media["default"] ??= []).push([realFileName, file]);
				}
			}

			if (!parsedPayload.pass) {
				throw new Error("Missing pass.json");
			}

			props.setLoading(false);
			setProcessingZipFile(false);

			return createProjectFromArchive(parsedPayload);
		} catch (err) {
			this.toggleErrorOverlay(`Unable to complete import. ${err.message}`);

			props.setLoading(false);
			setProcessingZipFile(false);
		}
	}

	useEffect(() => {
		/**
		 * Removing previously created records.
		 * Otherwise we might occour in orphan blob
		 * urls when the page is reloaded or
		 * restored.
		 */

		sessionStorage.clear();

		if (props.project?.file) {
			props.setLoading(true);
			processUploadedFile(
				{ currentTarget: { files: [props.project.file] } },
				{ title: props.project?.title, template: props.project?.template }
			);
		} else {
			initializeStore({ ...Store.initialState });
			wrapLoading(refreshForageCallback, null, LOADING_TIME_MS);
		}

		return () => {
			sessionStorage.clear();
		};
	}, []);

	return (
		<SwitchTransition>
			<CSSTransition
				// Fallback here is needed to avoid weird animation looping (https://git.io/Jvbpa)
				key={showConfigurator ? 'configurator' : 'pass-selector'}
				timeout={LOADING_TIME_MS}
				mountOnEnter
			>
				{!props.isLoading && !showConfigurator && <PassSelector onPassSelect={onPassSelect} />}
				{showConfigurator && (
					<Configurator
						templates={props.templates}
						onExport={props.onExport}
						onValidateFields={onValidateFields}
						exportTitle={props.exportTitle}
						exportButtonRef={props.exportButtonRef}
						exportErrors={exportErrors}
						hiddenFields={props.hiddenFields}
					/>
				)}
			</CSSTransition>
		</SwitchTransition>
	);
}

function createDelayedPromise(timeout: number, execution?: Function) {
	return new Promise<void>((resolve) => {
		setTimeout(() => {
			execution?.();
			resolve();
		}, timeout);
	});
}
